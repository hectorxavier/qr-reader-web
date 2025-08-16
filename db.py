import sqlite3

def init_db():
    conn = sqlite3.connect('attendance.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS asistencia (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario TEXT NOT NULL,
            fecha TEXT NOT NULL,
            hora TEXT NOT NULL,
            numero_qr TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()