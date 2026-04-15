# Dashboard Telemetría - Camet Robótica

Este es el sistema centralizado de telemetría y monitoreo para **Camet Robótica**, diseñado para visualizar y gestionar en tiempo real el estado del hardware, sensores y umbrales de alerta.

## 🚀 Características Principales

- **Sistema de Autenticación Seguro:** Acceso restringido mediante `Flask-Login` y `Bcrypt`.
  - Regla de acceso: Solo usuarios con privilegio `administrador` y pertenecientes a la empresa `Camet`.
- **Panel de Control (Dashboard):** Visualización en tiempo real de recursos (CPU, RAM, Red) mediante WebSockets y Chart.js.
- **Gestión de Umbrales:** Sección CRUD dedicada para configurar alertas personalizadas por sensor.
- **Interfaz Moderna:** Layout de panel único con sidebar responsivo, diseño oscuro y efectos de glassmorphism.
- **Seguridad:** Protección CSRF y registro de intentos de acceso sospechosos mediante un Logger de seguridad.

---

## 🛠️ Tecnologías Utilizadas

- **Backend:** Flask, Flask-Login, Flask-WTF (Python 3.12)
- **Base de Datos:** MariaDB (Usuarios) y PostgreSQL con TimescaleDB (Telemetría)
- **Frontend:** Vanilla JS, CSS (en componentes específicos), Chart.js, Socket.io
- **Seguridad:** Bcrypt para hashing de contraseñas, validación WTForms

---

## 📋 Requisitos Previos

- Python 3.x
- MariaDB / MySQL (para el sistema de usuarios)
- PostgreSQL (para la telemetría)

---

## ⚙️ Instalación y Configuración

1. **Instalar Dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Variables de Entorno (.env):**
   Crea un archivo `.env` basado en el `.env-example` con las siguientes claves:
   ```env
   # Base de Datos de Telemetría (PostgreSQL)
   DB_HOST=...
   DB_NAME=...
   DB_USER=...
   DB_PASS=...

   # Base de Datos de Usuarios (MariaDB)
   AUTH_MYSQL_HOST=...
   AUTH_MYSQL_USER=...
   AUTH_MYSQL_PASSWORD=...
   AUTH_MYSQL_DB=...
   ```

3. **Ejecutar la Aplicación:**
   ```bash
   python app.py
   ```
   Accede a port `5500` por defecto.

---

## 🚢 Despliegue (VPS)

Para sincronizar local con el servidor remoto (VPS), se utiliza el script de migración automatizado:

```bash
python migrate.py
```

**Este script realiza:**
1. Backup del directorio remoto.
2. Limpieza de archivos obsoletos.
3. Subida de nuevos módulos y assets.
4. Actualización de dependencias en el entorno virtual (`venv`).
5. Reinicio automático del servicio `systemd`.

---

## 📂 Estructura del Proyecto

- `/static`: Archivos CSS, JS y recursos multimedia.
- `/templates`: Plantillas HTML (Jinja2).
- `auth_manager.py`: Lógica de conexión a la base de datos de usuarios.
- `auth_routes.py`: Definición de endpoints de login/logout.
- `app.py`: Punto de entrada principal y lógica de la API de telemetría.
- `migrate.py`: Script de despliegue al VPS.
- `security_logger.py`: Módulo de auditoría de acceso.
