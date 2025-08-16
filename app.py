from flask import Flask, request, jsonify
from db import init_db
import sqlite3
from datetime import datetime

app = Flask(__name__)

init_db()

@app.route('/asistencia', methods=['POST'])
def registrar_asistencia():
    data = request.get_json()
    id_usuario = data.get('id_usuario')
    numero_qr = data.get('numero_qr')

    if not id_usuario or not numero_qr:
        return jsonify({'error': 'Datos incompletos'}), 400

    fecha = datetime.now().strftime('%Y-%m-%d')
    hora = datetime.now().strftime('%H:%M:%S')

    conn = sqlite3.connect('attendance.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO asistencia (id_usuario, fecha, hora, numero_qr) VALUES (?, ?, ?, ?)',
                   (id_usuario, fecha, hora, numero_qr))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Asistencia registrada exitosamente'}), 201

if __name__ == '__main__':
    app.run(debug=True)
