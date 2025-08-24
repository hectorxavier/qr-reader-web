from flask import Flask, request, jsonify, render_template, redirect, url_for, session, Response
import math, time
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_db_connection, init_db

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
        user = conn.cursor()
        user.execute("SELECT id, password, ver_registros, is_admin FROM usuarios WHERE username=%s", (username,))
        user = user.fetchone()
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
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO asistencia (user_id, qr_number, qr_lat, qr_lon, user_lat, user_lon, distancia, estado, fecha, hora)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
    cursor = conn.cursor()

    query = """
        SELECT a.id, u.username, a.qr_number, a.distancia, a.estado, a.fecha, a.hora
        FROM asistencia a
        JOIN usuarios u ON a.user_id = u.id
        WHERE 1=1
    """
    params = []

    if usuario:
        query += " AND u.username = %s"
        params.append(usuario)
    if fecha_inicio:
        query += " AND a.fecha >= %s"
        params.append(fecha_inicio)
    if fecha_fin:
        query += " AND a.fecha <= %s"
        params.append(fecha_fin)

    cursor.execute(query, params)
    registros = cursor.fetchall()
    cursor.execute("SELECT DISTINCT username FROM usuarios")
    usuarios = [row["username"] for row in cursor.fetchall()]
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
    cursor = conn.cursor()

    query = """
        SELECT a.id, u.username, a.qr_number, a.distancia, a.estado, a.fecha, a.hora
        FROM asistencia a
        JOIN usuarios u ON a.user_id = u.id
        WHERE 1=1
    """
    params = []

    if usuario:
        query += " AND u.username = %s"
        params.append(usuario)
    if fecha_inicio:
        query += " AND a.fecha >= %s"
        params.append(fecha_inicio)
    if fecha_fin:
        query += " AND a.fecha <= %s"
        params.append(fecha_fin)

    cursor.execute(query, params)
    registros = cursor.fetchall()
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
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, ver_registros, is_admin FROM usuarios")
    usuarios_list = cursor.fetchall()
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
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO usuarios (username, password, ver_registros, is_admin) VALUES (%s, %s, %s, %s)",
            (username, hashed, ver_registros, is_admin)
        )
        conn.commit()
        conn.close()
        return "OK", 200
    except Exception as e:
        return f"Error: {str(e)}", 400

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
    cursor = conn.cursor()
    if password:
        hashed = generate_password_hash(password)
        cursor.execute(
            "UPDATE usuarios SET username=%s, password=%s, ver_registros=%s, is_admin=%s WHERE id=%s",
            (username, hashed, ver_registros, is_admin, user_id)
        )
    else:
        cursor.execute(
            "UPDATE usuarios SET username=%s, ver_registros=%s, is_admin=%s WHERE id=%s",
            (username, ver_registros, is_admin, user_id)
        )
    conn.commit()
    conn.close()
    return "OK", 200

@app.route("/usuarios/delete/<int:user_id>", methods=["POST"])
def delete_usuario(user_id):
    if "user_id" not in session or not session.get("is_admin"):
        return "No autorizado", 403

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM usuarios WHERE id=%s", (user_id,))
    conn.commit()
    conn.close()
    return "OK", 200

# -----------------------------
# Ejecutar app
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)
