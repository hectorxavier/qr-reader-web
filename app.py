from flask import Flask, request, jsonify, render_template
import sqlite3, math, time

app = Flask(__name__)

# ---------------------------------------------
# Función para calcular distancia entre dos coordenadas (Haversine)
# ---------------------------------------------
def haversine(lat1, lon1, lat2, lon2):
    R = 6371e3  # radio de la Tierra en metros
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2*R*math.atan2(math.sqrt(a), math.sqrt(1-a))

# ---------------------------------------------
# Página principal
# ---------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")

# ---------------------------------------------
# Escaneo de QR y registro de asistencia
# ---------------------------------------------
@app.route("/scan", methods=["POST"])
def scan():
    data = request.json
    qr_data = data.get("qr_data")
    user_lat = float(data.get("latitude"))
    user_lon = float(data.get("longitude"))

    # Extraer coordenadas y número del QR
    try:
        coords, qr_number = qr_data.split("|")
        qr_lat, qr_lon = map(float, coords.split(","))
    except:
        return jsonify({"message": "Formato de QR inválido"}), 400

    # Calcular distancia en metros
    dist = haversine(user_lat, user_lon, qr_lat, qr_lon)
    status = "VALIDO" if dist <= 50 else "INVALIDO"  # umbral 50m
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

    # Guardar en SQLite
    conn = sqlite3.connect("scans.db")
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS asistencia (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero TEXT,
            qr_lat REAL,
            qr_lon REAL,
            user_lat REAL,
            user_lon REAL,
            distancia REAL,
            estado TEXT,
            fecha TEXT
        )
    """)
    c.execute("""
        INSERT INTO asistencia (numero, qr_lat, qr_lon, user_lat, user_lon, distancia, estado, fecha)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (qr_number, qr_lat, qr_lon, user_lat, user_lon, dist, status, timestamp))
    conn.commit()
    conn.close()

    return jsonify({
        "message": f"Asistencia {status}",
        "distancia_m": round(dist, 2),
        "estado": status
    })

# ---------------------------------------------
# Mostrar todos los registros de asistencia
# ---------------------------------------------
@app.route("/asistencias")
def asistencias():
    conn = sqlite3.connect("scans.db")
    c = conn.cursor()
    c.execute("""
        SELECT numero, qr_lat, qr_lon, user_lat, user_lon, distancia, estado, fecha
        FROM asistencia ORDER BY id DESC
    """)
    registros = c.fetchall()
    conn.close()

    columnas = ["numero", "qr_lat", "qr_lon", "user_lat", "user_lon", "distancia", "estado", "fecha"]
    registros_dict = [dict(zip(columnas, r)) for r in registros]

    return render_template("asistencias.html", registros=registros_dict)

# ---------------------------------------------
# Ejecutar app
# ---------------------------------------------
if __name__ == "__main__":
    app.run(debug=True)
