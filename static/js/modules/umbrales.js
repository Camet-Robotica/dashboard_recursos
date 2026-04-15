import { SENSOR_UNIT_MAP } from './constants.js';

// ─── Estado de edición ───────────────────────────────────────────────────────
let editingId = null;

export function initUmbrales() {
    loadHardware();
    loadSensors();
    loadUmbrales();

    const form = document.getElementById('umbral-form');
    const cancelBtn = document.getElementById('umbral-cancel-btn');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const sensorId = document.getElementById('sensor-select').value;
            const hardwareId = document.getElementById('hardware-select').value || null;
            const umbralMax = document.getElementById('umbral-max').value;

            if (!sensorId || !umbralMax) return;

            try {
                let res;
                if (editingId !== null) {
                    // PUT para modificar
                    res = await fetch('/api/umbrales/' + editingId, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sensor_id: parseInt(sensorId),
                            hardware_id: hardwareId ? parseInt(hardwareId) : null,
                            umbral_max: parseFloat(umbralMax)
                        })
                    });
                } else {
                    // POST para crear
                    res = await fetch('/api/umbrales', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sensor_id: parseInt(sensorId),
                            hardware_id: hardwareId ? parseInt(hardwareId) : null,
                            umbral_max: parseFloat(umbralMax)
                        })
                    });
                }

                if (res.ok) {
                    resetForm();
                    loadUmbrales();
                } else {
                    const data = await res.json();
                    alert('Error al guardar: ' + (data.error || 'desconocido'));
                }
            } catch (err) {
                console.error('Error guardando umbral:', err);
            }
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetForm);
    }
}

function resetForm() {
    editingId = null;
    document.getElementById('umbral-form').reset();
    document.getElementById('umbral-edit-id').value = '';
    document.getElementById('umbral-submit-btn').textContent = 'Agregar Umbral';
    document.getElementById('umbral-cancel-btn').style.display = 'none';
}

// ─── Carga de listas ──────────────────────────────────────────────────────────

async function loadHardware() {
    try {
        const res = await fetch('/api/hardware');
        const data = await res.json();
        const sel = document.getElementById('hardware-select');
        sel.innerHTML = '<option value="">Sin componente específico</option>';
        data.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h.hardware_id;
            opt.textContent = h.hardware_type;
            sel.appendChild(opt);
        });
    } catch (err) {
        console.error('Error loading hardware:', err);
    }
}

async function loadSensors() {
    try {
        const res = await fetch('/api/sensors');
        const data = await res.json();
        const sel = document.getElementById('sensor-select');
        sel.innerHTML = '<option value="">Seleccione un sensor...</option>';
        data.forEach(s => {
            const uInfo = SENSOR_UNIT_MAP[s.sensor_type] || { symbol: '' };
            const label = `${s.sensor_name} (${s.sensor_type})${uInfo.symbol ? ' [' + uInfo.symbol + ']' : ''}`;
            const opt = document.createElement('option');
            opt.value = s.sensor_id;
            opt.textContent = label;
            sel.appendChild(opt);
        });
    } catch (err) {
        console.error('Error loading sensors:', err);
    }
}

// ─── Tabla de umbrales ────────────────────────────────────────────────────────

async function loadUmbrales() {
    try {
        const res = await fetch('/api/umbrales');
        const data = await res.json();
        const tbody = document.getElementById('umbrales-tbody');
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:32px;">
                No hay umbrales configurados.</td></tr>`;
            return;
        }

        data.forEach(u => {
            // ID especial 999 = configuración de tiempo de chequeo
            const SPECIAL_ID = 999;
            const isSpecial = u.sensor_id === SPECIAL_ID || u.hardware_id === SPECIAL_ID;

            const uInfo = SENSOR_UNIT_MAP[u.sensor_type] || {};
            const sym = isSpecial ? 's' : (uInfo.symbol || '');

            const hwLabel = isSpecial
                ? 'CONFIGURACIÓN'
                : (u.hardware_name && u.hardware_name !== 'General' ? u.hardware_name : (u.hardware_id !== null ? u.hardware_name : '—'));
            const sensorLabel = isSpecial
                ? 'Tiempo de establecimiento de parámetros'
                : (u.sensor_name || 'Desconocido');

            const tr = document.createElement('tr');
            tr.dataset.id = u.umbral_id;
            tr.innerHTML = `
                <td>${hwLabel}</td>
                <td>${sensorLabel}</td>
                <td style="font-family:var(--font-mono);font-weight:600;color:var(--accent);">
                    ${u.umbral_max} ${sym}
                </td>
                <td class="actions-col" style="display:flex;gap:6px;justify-content:flex-end;">
                    <button class="btn-edit"   data-id="${u.umbral_id}">Editar</button>
                    <button class="btn-danger" data-id="${u.umbral_id}">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Eventos Eliminar
        tbody.querySelectorAll('.btn-danger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm('¿Seguro que deseas eliminar este umbral?')) {
                    deleteUmbral(id);
                }
            });
        });

        // Eventos Editar — pre-rellena el formulario
        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const row = data.find(u => u.umbral_id === id);
                if (!row) return;

                editingId = id;
                document.getElementById('umbral-edit-id').value = id;
                document.getElementById('sensor-select').value = row.sensor_id;
                document.getElementById('hardware-select').value = row.hardware_id || '';
                document.getElementById('umbral-max').value = row.umbral_max;
                document.getElementById('umbral-submit-btn').textContent = 'Guardar Cambios';
                document.getElementById('umbral-cancel-btn').style.display = 'inline-flex';

                // Scroll al formulario
                document.getElementById('umbral-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

    } catch (err) {
        console.error('Error loading umbrales:', err);
    }
}

// ─── Eliminar ─────────────────────────────────────────────────────────────────

async function deleteUmbral(id) {
    try {
        const res = await fetch('/api/umbrales/' + id, { method: 'DELETE' });
        if (res.ok) {
            if (editingId === parseInt(id)) resetForm();
            loadUmbrales();
        } else {
            alert('Error eliminando umbral');
        }
    } catch (err) {
        console.error('Error deleting umbral:', err);
    }
}
