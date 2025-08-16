from flask import Flask, request, jsonify, render_template
from db import init_db, get_all_records
import sqlite3
from datetime import datetime

app = Flask(__name__)

init_db()

@app.route('/')
def index():
    return render_template('index.html')

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

@app.route('/asistencia', methods=['GET'])
def mostrar_asistencias():
    records = get_all_records()
    asistencia_list = []
    for row in records:
        asistencia_list.append({
            'id': row[0],
            'id_usuario': row[1],
            'fecha': row[2],
            'hora': row[3],
            'numero_qr': row[4]
        })
    return jsonify(asistencia_list), 200

if __name__ == '__main__':
    # Para desarrollo
    app.run(host='0.0.0.0', port=5000, debug=True)
