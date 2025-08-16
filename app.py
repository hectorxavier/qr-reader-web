from flask import Flask, render_template, request, jsonify
import os

app = Flask(__name__)

# Lista para almacenar los QR escaneados
scans = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/save', methods=['POST'])
def save_scan():
    data = request.get_json()
    code = data.get('code')
    scans.append({'code': code})
    return jsonify({"message": "Guardado"})

@app.route('/scans', methods=['GET'])
def get_scans():
    return jsonify(scans)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
