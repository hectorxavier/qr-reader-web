# db.py
import sqlite3

def init_db():
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person_id TEXT NOT NULL,
            qr_address TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def save_scan(person_id, qr_address):
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    c.execute('INSERT INTO scans (person_id, qr_address) VALUES (?, ?)', (person_id, qr_address))
    conn.commit()
    conn.close()

def get_scans():
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    c.execute('SELECT * FROM scans ORDER BY timestamp DESC')
    rows = c.fetchall()
    conn.close()
    return rows
