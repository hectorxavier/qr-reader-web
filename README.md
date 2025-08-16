# QR Reader Web App

Aplicación web para **lectura de códigos QR** usando **Python (Flask)** y **html5-qrcode**.  
La aplicación permite leer códigos QR desde la cámara del dispositivo, mostrar el resultado y almacenar los escaneos en memoria.

---

## Funcionalidades

- Escaneo de códigos QR en tiempo real desde la cámara.
- Mostrar el contenido del QR en pantalla.
- Almacenar los QR escaneados en el backend.
- Consultar los códigos escaneados mediante una API (`/scans`).

---

## Estructura del proyecto

qr-attendance-app/
├── app.py                  # Archivo principal de Flask con endpoints para guardar y mostrar asistencia, compatible con Flask/Werkzeug recientes
├── db.py                   # Manejo de la base de datos SQLite con tabla asistencia
├── attendance.db           # Base de datos SQLite (no se sube a GitHub)
├── requirements.txt        # Dependencias de Python actualizadas, incluye gunicorn
├── templates/
│   └── index.html          # Frontend HTML con <ul> para mostrar registros
├── static/
│   ├── style.css           # Estilos CSS
│   └── script.js           # JS modificado para enviar datos y mostrar registros del backend
└── README.md               # Documentación del proyecto