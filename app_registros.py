from flask import Flask, request, render_template, redirect, url_for, session
import sqlite3, time
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "OTRO_SECRETO_PARA_REGISTROS"  # independiente del app principal

# -----------------------------
# Inicializar DB y usuario admin_registros
# -----------------------------
def init_db():
    conn = sqlite3.connect("scans.db")
    c = conn.cursor()
    # Crear tabla usuarios_registros
    c.execute("""
        CREATE TABLE IF NOT EXISTS usuarios_registros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)
    # Crear usuario por defecto si no existe ninguno
    c.execute("SELECT COUNT(*) FROM usuarios_registros")
    if c.fetchone()[0] == 0:
        default_user = "registros_admin"
        default_pass = generate_password_hash("reg123")
        c.execute("INSERT INTO usuarios_registros (username, password) VALUES (?, ?)", (default_user, default_pass))
        print("Usuario registros creado: registros_admin / reg123")
    conn.commit()
    conn.close()

init_db()

# -----------------------------
# Login Registros
# -----------------------------
@app.route("/login_registros", methods=["GET", "POST"])
def login_registros():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        conn = sqlite3.connect("scans.db")
        c = conn.cursor()
        c.execute("SELECT id, password FROM usuarios_registros WHERE username=?", (username,))
        user = c.fetchone()
        conn.close()

        if user and check_password_hash(user[1], password):
            session["reg_user_id"] = user[0]
            session["reg_username"] = username
            return redirect(url_for("ver_registros"))
        else:
            return "Usuario o contraseña incorrectos", 401
    return render_template("registros_login.html")

@app.route("/logout_registros")
def logout_registros():
    session.clear()
    return redirect(url_for("login_registros"))

# -----------------------------
# Ver registros
# -----------------------------
@app.route("/ver_registros")
def ver_registros():
    if "reg_user_id" not in session:
        return redirect(url_for("login_registros"))

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

    return render_template("registros.html", registros=registros_dict, username=session.get("reg_username"))

# -----------------------------
# Ejecutar app
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)
