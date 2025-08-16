from flask import Flask, request, jsonify, render_template, redirect, url_for, session
import sqlite3, math, time
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "TU_SECRETO_AQUI"

# -----------------------------
# Función Haversine
# -----------------------------
def haversine(lat1, lon1, lat2, lon2):
    R = 6371e3
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2*R*math.atan2(math.sqrt(a), math.sqrt(1-a))

# -----------------------------
# Inicializar DB
# -----------------------------
def init_db():
    conn = sqlite3.connect("scans.db")
    c = conn.cursor()
    # Tabla usuarios
    c.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)
    # Tabla asistencias
    c.execute("""
        CREATE TABLE IF NOT EXISTS asistencia (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            qr_number TEXT,
            qr_lat REAL,
            qr_lon REAL,
            user_lat REAL,
            user_lon REAL,
            distancia REAL,
            estado TEXT,
            fecha TEXT,
            hora TEXT,
            FOREIGN KEY(user_id) REFERENCES usuarios(id)
        )
    """)

    # Crear usuarios por defecto si no existen
    c.execute("SELECT COUNT(*) FROM usuarios")
    count = c.fetchone()[0]
    if count == 0:
        c.execute("INSERT INTO usuarios (username, password) VALUES (?, ?)", 
                  ("admin", generate_password_hash("admin123")))
        c.execute("INSERT INTO usuarios (username, password) VALUES (?, ?)", 
                  ("guest", generate_password_hash("guest123")))
        print("Usuarios por defecto creados: admin/admin123, guest/guest123")

    conn.commit()
    conn.close()

init_db()

# -----------------------------
# Login y Logout
# -----------------------------
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
