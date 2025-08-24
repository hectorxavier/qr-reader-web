from flask import Flask, request, jsonify, render_template, redirect, url_for, session, Response
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
# DB Helper
# -----------------------------
def get_db_connection():
    conn = sqlite3.connect("scans.db")
    conn.row_factory = sqlite3.Row
    return conn

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
            password TEXT NOT NULL,
            ver_registros INTEGER DEFAULT 0,
            is_admin INTEGER DEFAULT 0
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

    # Usuario por defecto
    c.execute("SELECT COUNT(*) FROM usuarios")
    if c.fetchone()[0] == 0:
        default_user = "admin"
        default_pass = generate_password_hash("admin123")
        c.execute("INSERT INTO usuarios (username, password, ver_registros, is_admin) VALUES (?, ?, ?, ?)",
                  (default_user, default_pass, 1, 1))
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

        conn = get_db_connection()
        user = conn.execute("SELECT id, password, ver_registros, is_admin FROM usuarios WHERE username=?", (username,)).fetchone()
        conn.close()

        if user and check_password_hash(user["password"], password):
            session["user_id"] = user["id"]
            session["username"] = username
            session["ver_registros"] = bool(user["ver_registros"])
            session["is_admin"] = bool(user["is_admin"])
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

    conn = get_db_connection()
    conn.execute("""
        INSERT INTO asistencia (user_id, qr_number, qr_lat, qr_lon, user_lat, user_lon, distancia, estado, fecha, hora)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (session["user_id"], qr_number, qr_lat, qr_lon, user_lat, user_lon, dist, status, fecha, hora))
    conn.commit()
    conn.close()

    return jsonify({"message": f"Asistencia {status}", "distancia_m": round(dist, 2), "estado": status})

# -----------------------------
# Ver registros (con filtros)
# -----------------------------
@app.route("/registros")
def registros():
    if "user_id" not in session or not session.get("ver_registros"):
        return "No autorizado", 403

    usuario = request.args.get("usuario", "")
    fecha_inicio = request.args.get("fecha_inicio", "")
    fecha_fin = request.args.get("fecha_fin", "")

    conn = get_db_connection()
    query = """
        SELECT a.id, u.username, a.qr_number, a.distancia, a.estado, a.fecha, a.hora
        FROM asistencia a
        JOIN usuarios u ON a.user_id = u.id
        WHERE 1=1
    """
    params = []

    if usuario:
        query += " AND u.username = ?"
        params.append(usuario)
    if fecha_inicio:
        query += " AND a.fecha >= ?"
        params.append(fecha_inicio)
    if fecha_fin:
        query += " AND a.fecha <= ?"
        params.append(fecha_fin)

    registros = conn.execute(query, params).fetchall()
    usuarios = [row["username"] for row in conn.execute("SELECT DISTINCT username FROM usuarios").fetchall()]
    conn.close()

    return render_template("registros.html", registros=registros, usuarios=usuarios)

# -----------------------------
# Descargar registros en TXT
# -----------------------------
@app.route("/registros/descargar")
def descargar_registros():
    if "user_id" not in session or not session.get("ver_registros"):
        return "No autorizado", 403

    usuario = request.args.get("usuario", "")
    fecha_inicio = request.args.get("fecha_inicio", "")
    fecha_fin = request.args.get("fecha_fin", "")

    conn = get_db_connection()
    query = """
        SELECT a.id, u.username, a.qr_number, a.distancia, a.estado, a.fecha, a.hora
        FROM asistencia a
        JOIN usuarios u ON a.user_id = u.id
        WHERE 1=1
    """
    params = []

    if usuario:
        query += " AND u.username = ?"
        params.append(usuario)
    if fecha_inicio:
        query += " AND a.fecha >= ?"
        params.append(fecha_inicio)
    if fecha_fin:
        query += " AND a.fecha <= ?"
        params.append(fecha_fin)

    registros = conn.execute(query, params).fetchall()
    conn.close()

    contenido = "ID | Usuario | QR | Distancia (m) | Estado | Fecha | Hora\n"
    contenido += "-"*70 + "\n"
    for r in registros:
        contenido += f"{r['id']} | {r['username']} | {r['qr_number']} | {round(r['distancia'],2)} | {r['estado']} | {r['fecha']} | {r['hora']}\n"

    return Response(
        contenido,
        mimetype="text/plain",
        headers={"Content-Disposition": "attachment;filename=registros.txt"}
    )

# -----------------------------
# Gestión de usuarios (Admin)
# -----------------------------
@app.route("/usuarios")
def usuarios():
    if "user_id" not in session or not session.get("is_admin"):
        return "No tiene permiso para gestionar usuarios", 403

    conn = get_db_connection()
    usuarios_list = conn.execute("SELECT id, username, ver_registros, is_admin FROM usuarios").fetchall()
    conn.close()

    usuarios_dict = [{"id": u["id"], "username": u["username"], "ver_registros": u["ver_registros"], "is_admin": u["is_admin"]} for u in usuarios_list]
    return render_template("usuarios.html", usuarios=usuarios_dict)

@app.route("/usuarios/add", methods=["POST"])
def add_usuario():
    if "user_id" not in session or not session.get("is_admin"):
        return "No autorizado", 403

    data = request.json
    username = data.get("username")
    password = data.get("password")
    ver_registros = int(data.get("can_view_logs", 0))
    is_admin = int(data.get("is_admin", 0))

    hashed = generate_password_hash(password)
    try:
        conn = get_db_connection()
        conn.execute("INSERT INTO usuarios (username, password, ver_registros, is_admin) VALUES (?, ?, ?, ?)",
                     (username, hashed, ver_registros, is_admin))
        conn.commit()
        conn.close()
        return "OK", 200
    except sqlite3.IntegrityError:
        return "El usuario ya existe", 400

@app.route("/usuarios/edit/<int:user_id>", methods=["POST"])
def edit_usuario(user_id):
    if "user_id" not in session or not session.get("is_admin"):
        return "No autorizado", 403

    data = request.json
    username = data.get("username")
    password = data.get("password")
    ver_registros = int(data.get("can_view_logs", 0))
    is_admin = int(data.get("is_admin", 0))

    conn = get_db_connection()
    if password:
        hashed = generate_password_hash(password)
        conn.execute("UPDATE usuarios SET username=?, password=?, ver_registros=?, is_admin=? WHERE id=?",
                     (username, hashed, ver_registros, is_admin, user_id))
    else:
        conn.execute("UPDATE usuarios SET username=?, ver_registros=?, is_admin=? WHERE id=?",
                     (username, ver_registros, is_admin, user_id))
    conn.commit()
    conn.close()
    return "OK", 200

@app.route("/usuarios/delete/<int:user_id>", methods=["POST"])
def delete_usuario(user_id):
    if "user_id" not in session or not session.get("is_admin"):
        return "No autorizado", 403

    conn = get_db_connection()
    conn.execute("DELETE FROM usuarios WHERE id=?", (user_id,))
    conn.commit()
    conn.close()
    return "OK", 200

# -----------------------------
# Ejecutar app
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)
