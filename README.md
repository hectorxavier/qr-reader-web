QR Reader con Backend en SQLite

Este proyecto es una aplicación web que permite escanear códigos QR usando la cámara del dispositivo y registrar la asistencia de los usuarios en una base de datos SQLite.

Incluye validación de la ubicación GPS del usuario y varias mejoras de usabilidad para asegurar un registro confiable.

✨ Características principales

📷 Escaneo automático de QR con la cámara del dispositivo (móviles y PC con cámara).

🌍 Validación de ubicación GPS mediante navigator.geolocation.

📌 Registro en SQLite usando backend con Flask.

🔒 El sistema solo registra asistencia si el usuario está cerca de la ubicación definida en el QR (validación de distancia con tolerancia de 50 metros).

⏳ Control de tiempo de escaneo: si no se detecta un QR en 60 segundos, se cancela el proceso automáticamente.

🔔 Notificaciones en pantalla al usuario: estado de ubicación, escaneo correcto, errores o tiempo agotado.

🧾 Gestión de registros:

Consulta por usuario y fecha.

Exportación de registros a archivo .txt.

⚠️ Manejo de errores y permisos:

Si el usuario no concede permisos de cámara o ubicación → se notifica.

Funciona bajo HTTPS (requerido especialmente en Safari iOS).

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