from flask import Flask, render_template, request, redirect, url_for, session
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "REGISTROS_SECRETO"

# -----------------------------
# Inicializar DB de usuarios de registros
# -----------------------------
def init_db():
    conn = sqlite3.connect("scans.db")
    c = conn.cursor()
    # Crear tabla usuarios_registros si no existe
    c.execute("""
        CREATE TABLE IF NOT EXISTS usuarios_registros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)
    # Crear usuario por defecto si no existe
    c.execute("SELECT COUNT(*) FROM usuarios_registros")
    count = c.fetchone()[0]
    if count == 0:
        c.execute("INSERT INTO usuarios_registros (username, password) VALUES (?, ?)",
                  ("admin_registros", generate_password_hash("admin123")))
        c.execute("INSERT INTO usuarios_registros (username, password) VALUES (?, ?)",
                  ("guest_registros", generate_password_hash("guest123")))
        print("Usuarios por defecto de registros creados: admin_registros/admin123, guest_registros/guest123")
    conn.commit()
    conn.close()

init_db()

# -----------------------------
# Login y Logout
# -----------------------------
@app.route("/login_registros", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        conn = sqlite3.connect("scans.db")
        c = conn.cursor()
        c.execute("SELECT id, password FROM usuarios_registros WHERE username=?", (username,))
        user = c.fetchone()
        conn.close()

        if user and check_password_hash(user[1], password):
            session["user_id"] = user[0]
            session["username"] = username
            return redirect(url_for("registros"))
        else:
            return "Usuario o contraseña incorrectos", 401

    return render_template("login_registros.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

# -----------------------------
# Vista de registros con filtros
# -----------------------------
@app.route("/registros")
def registros():
    if "user_id" not in session:
        return redirect(url_for("login"))

    usuario = request.args.get("usuario", "")
    fecha = request.args.get("fecha", "")
    estado = request.args.get("estado", "")

    conn = sqlite3.connect("scans.db")
    c = conn.cursor()
    query = """
        SELECT a.id, u.username, a.qr_number, a.qr_lat, a.qr_lon,
               a.user_lat, a.user_lon, a.distancia, a.estado, a.fecha, a.hora
        FROM asistencia a
        JOIN usuarios u ON a.user_id = u.id
        WHERE 1=1
    """
    params = []
    if usuario:
        query += " AND u.username LIKE ?"
        params.append(f"%{usuario}%")
    if fecha:
        query += " AND a.fecha = ?"
        params.append(fecha)
    if estado:
        query += " AND a.estado = ?"
        params.append(estado)

    query += " ORDER BY a.id DESC"
    c.execute(query, params)
    registros = c.fetchall()
    conn.close()

    columnas = ["id", "username", "qr_number", "qr_lat", "qr_lon",
                "user_lat", "user_lon", "distancia", "estado", "fecha", "hora"]
    registros_dict = [dict(zip(columnas, r)) for r in registros]

    return render_template("registros.html", registros=registros_dict, usuario=usuario, fecha=fecha, estado=estado)

# -----------------------------
# Ejecutar app
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True, port=5001)  # puerto distinto si quieres desplegar junto a la app de escaneo
