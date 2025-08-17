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
        password = request.form["password"]
        conn = sqlite3.connect("scans.db")
        c = conn.cursor()
        c.execute("SELECT id, password FROM usuarios WHERE username=?", (username,))
        user = c.fetchone()
        conn.close()
        if user and check_password_hash(user[1], password):
            session["user_id"] = user[0]
            session["username"] = username
            return redirect(url_for("index"))
        else:
            return "Usuario o contraseña incorrectos", 401
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

# -----------------------------
# Página principal
# -----------------------------
@app.route("/")
def index():
    if "user_id" not in session:
        return redirect(url_for("login"))
    username = session.get("username")
    is_admin = username == "admin"
    return render_template("index.html", username=username, is_admin=is_admin)

# -----------------------------
# Escaneo de QR
# -----------------------------
@app.route("/scan", methods=["POST"])
def scan():
    try:
        if "user_id" not in session:
            return jsonify({"message": "No autorizado"}), 401

        data = request.get_json()
        qr_data = data.get("qr_data")
        user_lat = float(data.get("latitude"))
        user_lon = float(data.get("longitude"))

        coords, qr_number = qr_data.split("|")
        qr_lat, qr_lon = map(float, coords.split(","))

        dist = haversine(user_lat, user_lon, qr_lat, qr_lon)
        status = "VALIDO" if dist <= 50 else "INVALIDO"
        fecha = time.strftime("%Y-%m-%d")
        hora = time.strftime("%H:%M:%S")

        conn = sqlite3.connect("scans.db")
        c = conn.cursor()
        c.execute("""
            INSERT INTO asistencia (user_id, qr_number, qr_lat, qr_lon, user_lat, user_lon, distancia, estado, fecha, hora)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (session["user_id"], qr_number, qr_lat, qr_lon, user_lat, user_lon, dist, status, fecha, hora))
        conn.commit()
        conn.close()

        return jsonify({"message": f"Asistencia {status}", "distancia_m": round(dist,2), "estado": status})

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"message": "Error al procesar QR: " + str(e)}), 400

# -----------------------------
# Mostrar asistencias (solo admin)
# -----------------------------
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

    columnas = ["id", "username", "qr_number", "qr_lat", "qr_lon", "user_lat", "user_lon", "distancia", "estado", "fecha", "hora"]
    registros_dict = [dict(zip(columnas, r)) for r in registros]

    return render_template("asistencias.html", registros=registros_dict)

# -----------------------------
# Ejecutar app
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)
