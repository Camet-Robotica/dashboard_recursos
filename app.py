import os
import psycopg2
from psycopg2 import extras
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
from flask_login import LoginManager, login_required
from datetime import datetime, timedelta
import threading

# Cargar .env desde el directorio actual o padre
load_dotenv() # Intenta el actual primero
env_path_parent = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path_parent)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'telemetry_secret_2024')
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Por favor inicia sesión para acceder a esta página.'
login_manager.login_message_category = 'warning'

from auth_manager import AuthManager
from auth_routes import auth_bp
app.register_blueprint(auth_bp)

@login_manager.user_loader
def load_user(user_id):
    return AuthManager.get_user_by_id(user_id)


# ─── DB ───────────────────────────────────────────────────────────────────────

def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "postgres"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASS", os.getenv("DB_PASSWORD", "")),
        port=os.getenv("DB_PORT", "5432")
    )

def load_meta(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT hardware_id, hardware_type FROM Componente")
        hw = {r[0]: r[1] for r in cur.fetchall()}
        cur.execute("SELECT sensor_id, sensor_name, sensor_type FROM Sensor")
        sen = {r[0]: {'name': r[1], 'type': r[2]} for r in cur.fetchall()}
    return hw, sen

def query_data(clients: list, start_time: datetime, end_time: datetime) -> dict:
    conn = get_db()
    hw_cache, sen_cache = load_meta(conn)
    duration = (end_time - start_time).total_seconds()

    if duration > 48 * 3600:
        trunc = "hour"
    elif duration > 6 * 3600:
        trunc = "minute"
    else:
        trunc = "raw"

    components = {}
    try:
        with conn.cursor() as cur:
            for client_table in clients:
                if not client_table.startswith("rec_"):
                    # Check in case it's actually sent as 'recursos_' from somewhere else
                    if client_table.startswith("recursos_"):
                        client_name = client_table[9:]
                    else:
                        continue
                else:
                    client_name = client_table[4:]

                # Consultar existencias de tabla u omitir si error
                try:
                    if trunc != "raw":
                        cur.execute(f"""
                            SELECT date_trunc('{trunc}', timestamp),
                                   hardware_id, sensor_id, hardware_name,
                                   AVG(value), MAX(value)
                            FROM {client_table}
                            WHERE timestamp >= %s AND timestamp <= %s
                            GROUP BY 1,2,3,4 ORDER BY 1 ASC
                        """, (start_time, end_time))
                    else:
                        cur.execute(f"""
                            SELECT timestamp, hardware_id, sensor_id, hardware_name,
                                   value, value
                            FROM {client_table}
                            WHERE timestamp >= %s AND timestamp <= %s
                            ORDER BY timestamp ASC
                        """, (start_time, end_time))
                    
                    for ts, hw_id, sen_id, hw_name, val, max_val in cur.fetchall():
                        val      = round(float(val),      3) if val      is not None else 0.0
                        max_val  = round(float(max_val),  3) if max_val  is not None else 0.0
                        ts_str   = ts.isoformat()

                        hw_type  = hw_cache.get(hw_id, "UNKNOWN")
                        si       = sen_cache.get(sen_id, {'name': 'Unknown', 'type': 'Unknown'})
                        sen_name = si['name']
                        sen_type = si['type']

                        # Group by the generic hardware type (e.g., CPU, GPU)
                        group_key = hw_type 

                        if group_key not in components:
                            components[group_key] = {'type': hw_type, 'sensors': {}}
                        if sen_type not in components[group_key]['sensors']:
                            components[group_key]['sensors'][sen_type] = {}
                        if sen_name not in components[group_key]['sensors'][sen_type]:
                            components[group_key]['sensors'][sen_type][sen_name] = {}
                            
                        if client_name not in components[group_key]['sensors'][sen_type][sen_name]:
                            components[group_key]['sensors'][sen_type][sen_name][client_name] = {
                                'data': [], 'max': -1e9, 'min': 1e9, 'last': None, 'hw_name': hw_name
                            }
                        
                        ref = components[group_key]['sensors'][sen_type][sen_name][client_name]
                        ref['data'].append({'x': ts_str, 'y': val})
                        ref['max'] = round(max(ref['max'], max_val), 3)
                        ref['min'] = round(min(ref['min'], val), 3)
                        ref['last'] = val
                except psycopg2.Error as e:
                    # Ignore table not found errors or other querying mistakes gracefully, continuing with next table.
                    # We might need to connection rollback if there was an error in transaction loop
                    conn.rollback()
                    print(f"Failed query on {client_table}: {e}")
                    
    except Exception as e:
        print("DB Error in compare:", e)
    finally:
        conn.close()

    # Padding de huecos
    if trunc == "hour": gap_thresh = timedelta(hours=1, minutes=10)
    elif trunc == "minute": gap_thresh = timedelta(minutes=1, seconds=30)
    else: gap_thresh = timedelta(seconds=30)
    
    gap_pad = timedelta(seconds=1)
    
    # Store dynamic client status natively
    client_status = {c: False for c in clients}

    for hw_info in components.values():
        for sensors in hw_info['sensors'].values():
            for sDict in sensors.values():
                for client_name, cData in sDict.items():
                    arr = cData['data']
                    if not arr: continue
                    new_arr = []
                    
                    full_client_table = next((c for c in clients if c.endswith(client_name)), None)
                    
                    first_dt = datetime.fromisoformat(arr[0]['x']).replace(tzinfo=None)
                    if first_dt - start_time > gap_thresh:
                        new_arr.append({'x': start_time.isoformat(), 'y': 0.0})
                        new_arr.append({'x': (first_dt - gap_pad).isoformat(), 'y': 0.0})
                    
                    new_arr.append(arr[0])
                    
                    for i in range(1, len(arr)):
                        prev_dt = datetime.fromisoformat(arr[i-1]['x']).replace(tzinfo=None)
                        curr_dt = datetime.fromisoformat(arr[i]['x']).replace(tzinfo=None)
                        if curr_dt - prev_dt > gap_thresh:
                            new_arr.append({'x': (prev_dt + gap_pad).isoformat(), 'y': 0.0})
                            new_arr.append({'x': (curr_dt - gap_pad).isoformat(), 'y': 0.0})
                        new_arr.append(arr[i])
                    
                    last_dt = datetime.fromisoformat(arr[-1]['x']).replace(tzinfo=None)
                    
                    if full_client_table and end_time - last_dt <= gap_thresh:
                        client_status[full_client_table] = True
                    
                    if end_time - last_dt > gap_thresh:
                        new_arr.append({'x': (last_dt + gap_pad).isoformat(), 'y': 0.0})
                        new_arr.append({'x': end_time.isoformat(), 'y': 0.0})
                        
                    cData['data'] = new_arr

    return components, client_status

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/api/hardware', methods=['GET'])
@login_required
def api_hardware():
    """Lista de componentes para poblar el select del formulario de umbrales."""
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT hardware_id, hardware_type FROM Componente ORDER BY hardware_type ASC")
            hardware = [dict(row) for row in cur.fetchall()]
        return jsonify(hardware)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/sensors', methods=['GET'])
@login_required
def api_sensors():
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT sensor_id, sensor_name, sensor_type FROM Sensor ORDER BY sensor_name ASC")
            sensors = [dict(row) for row in cur.fetchall()]
        return jsonify(sensors)
    except Exception as e:
        print("Error fetching sensors:", e)
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/umbrales', methods=['GET', 'POST'])
@login_required
def api_umbrales():
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            if request.method == 'GET':
                # hw_cache es {hardware_id: hardware_type_string}, enriquecemos sin JOINs
                hw_cache, sen_cache = load_meta(conn)

                cur.execute("SELECT umbral_id, sensor_id, hardware_id, umbral_max FROM umbrales ORDER BY umbral_id ASC")
                rows = cur.fetchall()
                data = []
                for r in rows:
                    s_info   = sen_cache.get(r['sensor_id'], {'name': 'Desconocido', 'type': 'Unknown'})
                    hw_label = hw_cache.get(r['hardware_id'], 'General') if r['hardware_id'] is not None else 'General'
                    data.append({
                        'umbral_id':     r['umbral_id'],
                        'sensor_id':     r['sensor_id'],
                        'hardware_id':   r['hardware_id'],
                        'sensor_name':   s_info['name'],
                        'sensor_type':   s_info['type'],
                        'hardware_name': hw_label,
                        'umbral_max':    float(r['umbral_max']),
                    })
                return jsonify(data)
                
            elif request.method == 'POST':
                req = request.json
                if not req or 'sensor_id' not in req or 'umbral_max' not in req:
                    return jsonify({'error': 'Faltan datos'}), 400
                cur.execute(
                    "INSERT INTO umbrales (sensor_id, hardware_id, umbral_max) VALUES (%s, %s, %s) RETURNING umbral_id",
                    (req['sensor_id'], req.get('hardware_id'), req['umbral_max'])
                )
                new_id = cur.fetchone()['umbral_id']
                conn.commit()
                return jsonify({'success': True, 'umbral_id': new_id}), 201
    except Exception as e:
        conn.rollback()
        print("Error en umbrales:", e)
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/umbrales/<int:umbral_id>', methods=['PUT', 'DELETE'])
@login_required
def api_modify_umbral(umbral_id):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            if request.method == 'PUT':
                req = request.json
                if not req or 'umbral_max' not in req:
                    return jsonify({'error': 'Faltan datos'}), 400
                cur.execute(
                    "UPDATE umbrales SET umbral_max = %s, hardware_id = %s WHERE umbral_id = %s",
                    (req['umbral_max'], req.get('hardware_id'), umbral_id)
                )
                conn.commit()
                return jsonify({'success': True})
            elif request.method == 'DELETE':
                cur.execute("DELETE FROM umbrales WHERE umbral_id = %s", (umbral_id,))
                conn.commit()
                return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

# ─── WebSocket ────────────────────────────────────────────────────────────────

@socketio.on('request_data')
def handle_request(payload):
    clients = payload.get('clients', [])
    start_str = payload.get('start')
    end_str   = payload.get('end')

    end_time   = datetime.fromisoformat(end_str[:16])   if end_str   else datetime.now()
    start_time = datetime.fromisoformat(start_str[:16]) if start_str else end_time - timedelta(hours=1)

    components, client_status = query_data(clients, start_time, end_time)

    emit('data_update', {
        'components': components,
        'client_status': client_status,
        'start': start_time.isoformat(),
        'end':   end_time.isoformat()
    })

@socketio.on('request_clients')
def handle_request_clients():
    conn = get_db()
    clients = []
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.relname 
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public' 
                  AND c.relname LIKE 'recursos_%'
                  AND c.relkind IN ('r', 'p')
                  AND c.relispartition = false
            """)
            clients = [row[0] for row in cur.fetchall()]
    except Exception as e:
        print("DB Error finding clients:", e)
    finally:
        conn.close()
    emit('clients_list', {'clients': clients})

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5500, host='0.0.0.0', allow_unsafe_werkzeug=True)
