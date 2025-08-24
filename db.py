import os
import psycopg2
from psycopg2.extras import RealDictCursor
from werkzeug.security import generate_password_hash

# -----------------------------
# Conexión a PostgreSQL
# -----------------------------
def get_db_connection():
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        # Fallback a la URL de Render
        DATABASE_URL = "postgresql://hyuquilima:uCKVmbAJowYyqwAi1z6j7zZhz3PybdVc@dpg-d2lld7er433s7393ii4g-a/attendance_db_l6sf"
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return conn

# -----------------------------
# Inicialización de la DB
# -----------------------------
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Tabla usuarios
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            ver_registros INTEGER DEFAULT 0,
            is_admin INTEGER DEFAULT 0
        )
    """)

    # Tabla asistencia
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS asistencia (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES usuarios(id),
            qr_number TEXT,
            qr_lat REAL,
            qr_lon REAL,
            user_lat REAL,
            user_lon REAL,
            distancia REAL,
            estado TEXT,
            fecha TEXT,
            hora TEXT
        )
    """)

    # Usuario por defecto
    cursor.execute("SELECT COUNT(*) AS count FROM usuarios")
    result = cursor.fetchone()
    if result["count"] == 0:
        default_user = "admin"
        default_pass = generate_password_hash("admin123")
        cursor.execute(
            "INSERT INTO usuarios (username, password, ver_registros, is_admin) VALUES (%s, %s, %s, %s)",
            (default_user, default_pass, 1, 1)
        )
        print("Usuario por defecto creado: admin / admin123")

    conn.commit()
    conn.close()
