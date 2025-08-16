from flask import Flask, render_template, request, jsonify
from db import init_db, save_scan, get_scans

app = Flask(__name__)
init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/save', methods=['POST'])
def save_qr():
    data = request.get_json()
    person_id = data.get('person_id')
    qr_address = data.get('qr_address')
    if not person_id or not qr_address:
        return jsonify({'message': 'Faltan datos'}), 400
    save_scan(person_id, qr_address)
    return jsonify({'message': 'Marcación registrada'})

@app.route('/scans', methods=['GET'])
def scans():
    data = get_scans()
    return jsonify(data)

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
