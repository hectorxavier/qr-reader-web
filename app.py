from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from math import radians, sin, cos, sqrt, atan2

app = Flask(__name__)
app.secret_key = "supersecretkey"

# Inicialización de base de datos
def init_db():
    conn = sqlite3.connect("scans.db")
    c = conn.cursor()

    # Tabla usuarios
    c.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
    """)

    # Tabla asistencias
    c.execute("""
        CREATE TABLE IF NOT EXISTS asistencia (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
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

    # Crear usuario por defecto
    c.execute("SELECT COUNT(*) FROM usuarios")
    count = c.fetchone()[0]
    if count == 0:
        c.execute("INSERT INTO usuarios (username, password) VALUES (?, ?)", 
                  ("admin", generate_password_hash("admin123")))
        c.execute("INSERT INTO usuarios (username, password) VALUES (?, ?)", 
                  ("guest", generate_password_hash("guest123")))
        print("Usuarios creados: admin/admin123 y guest/guest123")

    conn.commit()
    conn.close()

init_db()

# Función para calcular distancia entre coordenadas
def calcular_distancia(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlambda = radians(lon2 - lon1)
    a = sin(dphi/2)**2 + cos(phi1)*cos(phi2)*sin(dlambda/2)**2
    c = 2*atan2(sqrt(a), sqrt(1-a))
    return R * c

# Rutas
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        conn = sqlite3.connect("scans.db")
        c = conn.cursor()
        c.execute("SELECT id, password FROM usuarios WHERE username = ?", (username,))
        row = c.fetchone()
        conn.close()
        if row and check_password_hash(row[1], password):
            session["user_id"] = row[0]
            session["username"] = username
            return redirect(url_for("index"))
        return "Usuario o contraseña incorrectos"
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/")
def index():
    if "user_id" not in session:
        return redirect(url_for("login"))
    is_admin = session.get("username") == "admin"
    return render_template("index.html", username=session.get("username"), is_admin=is_admin)

@app.route("/scan", methods=["POST"])
def scan():
    if "user_id" not in session:
        return jsonify({"message": "No autorizado"}), 403

    data = request.get_json()
    qr_data = data["qr_data"]  # formato esperado: "lat,lon|numero"
    user_lat = float(data["latitude"])
    user_lon = float(data["longitude"])

    try:
        coords, qr_number = qr_data.split("|")
        qr_lat, qr_lon = map(float, coords.split(","))
    except:
        return jsonify({"message":"QR inválido", "distancia_m":0})

    distancia = calcular_distancia(user_lat, user_lon, qr_lat, qr_lon)
    estado = "OK" if distancia <= 50 else "FUERA"

    fecha = datetime.now().strftime("%Y-%m-%d")
    hora = datetime.now().strftime("%H:%M:%S")

    conn = sqlite3.connect("scans.db")
    c = conn.cursor()
    c.execute("""
        INSERT INTO asistencia (user_id, qr_number, qr_lat, qr_lon, user_lat, user_lon, distancia, estado, fecha, hora)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
    """, (session["user_id"], qr_number, qr_lat, qr_lon, user_lat, user_lon, distancia, estado, fecha, hora))
    conn.commit()
    conn.close()

    return jsonify({"message": f"Asistencia registrada ({estado})", "distancia_m": round(distancia, 2)})

@app.route("/asistencias")
def asistencias():
    if "user_id" not in session or session.get("username") != "admin":
        return "No autorizado", 403

    conn = sqlite3.connect("scans.db")
    c = conn.cursor()
    c.execute("""
        SELECT a.id, u.username, a.qr_number, a.qr_lat, a.qr_lon, a.user_lat, a.user_lon, a.distancia, a.estado, a.fecha, a.hora
        FROM asistencia a
        JOIN usuarios u ON a.user_id = u.id
        ORDER BY a.id DESC
    """)
    registros = c.fetchall()
    conn.close()
    columnas = ["id","username","qr_number","qr_lat","qr_lon","user_lat","user_lon","distancia","estado","fecha","hora"]
    registros_dict = [dict(zip(columnas, r)) for r in registros]
    return render_template("asistencias.html", registros=registros_dict)

if __name__ == "__main__":
    app.run(debug=True)
