from flask import Flask, request, jsonify, render_template, redirect, url_for, session
import sqlite3, math, time
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "TU_SECRETO_AQUI"

# -----------------------------
# Función Haversine para calcular distancia
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

    # Tabla usuarios con permiso de ver registros
    c.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            ver_registros INTEGER DEFAULT 0
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

    # Crear usuario por defecto si no existe
    c.execute("SELECT COUNT(*) FROM usuarios")
    count = c.fetchone()[0]
    if count == 0:
        default_user = "admin"
        default_pass = generate_password_hash("admin123")
        c.execute("INSERT INTO usuarios (username, password, ver_registros) VALUES (?, ?, ?)",
                  (default_user, default_pass, 1))
        print("Usuario por defecto creado: admin / admin123")

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
        c.execute("SELECT id, password, ver_registros FROM usuarios WHERE username=?", (username,))
        user = c.fetchone()
        conn.close()

        if user and check_password_hash(user[1], password):
            session["user_id"] = user[0]
            session["username"] = username
            session["ver_registros"] = user[2]
            return redirect(url_for("index"))
        else:
            return "Usuario o contraseña incorrectos", 401

    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

# -----------------------------
# Página principal - Scanner QR
# -----------------------------
@app.route("/")
def index():
    if "user_id" not in session:
        return redirect(url_for("login"))
    return render_template("index.html", username=session.get("username"))

# -----------------------------
# Escaneo de QR
# -----------------------------
@app.route("/scan", methods=["POST"])
def scan():
    if "user_id" not in session:
        return jsonify({"message": "No autorizado"}), 401

    data = request.json
    qr_data = data.get("qr_data")
    user_lat = float(data.get("latitude"))
    user_lon = float(data.get("longitude"))

    try:
        coords, qr_number = qr_data.split("|")
        qr_lat, qr_lon = map(float, coords.split(","))
    except:
        return jsonify({"message": "Formato de QR inválido"}), 400

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

    return jsonify({
        "message": f"Asistencia {status}",
        "distancia_m": round(dist, 2),
        "estado": status
    })

# -----------------------------
# Ver registros - controlando permisos
# -----------------------------
@app.route("/registros")
def registros():
    if "user_id" not in session:
        return redirect(url_for("login"))

    if not session.get("ver_registros"):
        return "No tiene permiso para ver los registros", 403

    conn = sqlite3.connect("scans.db")
    c = conn.cursor()
    c.execute("""
        SELECT a.id, u.username, a.qr_number, a.qr_lat, a.qr_lon,
               a.user_lat, a.user_lon, a.distancia, a.estado, a.fecha, a.hora
        FROM asistencia a
        JOIN usuarios u ON a.user_id = u.id
        ORDER BY a.id DESC
    """)
    registros = c.fetchall()
    conn.close()

    columnas = ["id", "username", "qr_number", "qr_lat", "qr_lon",
                "user_lat", "user_lon", "distancia", "estado", "fecha", "hora"]
    registros_dict = [dict(zip(columnas, r)) for r in registros]

    return render_template("registros.html", registros=registros_dict)

# -----------------------------
# Gestión de usuarios
# -----------------------------
@app.route("/usuarios", methods=["GET", "POST"])
def usuarios():
    if "user_id" not in session:
        return redirect(url_for("login"))

    if not session.get("ver_registros"):
        return "No tiene permiso para gestionar usuarios", 403

    conn = sqlite3.connect("scans.db")
    c = conn.cursor()

    message = None
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        ver_registros = 1 if "ver_registros" in request.form else 0

        hashed = generate_password_hash(password)
        try:
            c.execute("INSERT INTO usuarios (username, password, ver_registros) VALUES (?, ?, ?)",
                      (username, hashed, ver_registros))
            conn.commit()
            message = "Usuario creado correctamente"
        except sqlite3.IntegrityError:
            message = "El usuario ya existe"

    c.execute("SELECT id, username, ver_registros FROM usuarios")
    usuarios_list = c.fetchall()
    conn.close()

    return render_template("usuarios.html", usuarios=usuarios_list, message=message)

# -----------------------------
# Ejecutar app
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)
