-- Tabla usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    ver_registros INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0
);

-- Tabla asistencia
CREATE TABLE IF NOT EXISTS asistencia (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    qr_number TEXT,
    qr_lat REAL,
    qr_lon REAL,
    user_lat REAL,
    user_lon REAL,
    distancia REAL,
    estado TEXT,
    fecha TEXT,
    hora TEXT
);

-- Usuario por defecto (hash generado en Python)
INSERT INTO usuarios (username, password, ver_registros, is_admin)
SELECT 'admin', '<HASH_AQUI>', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE username='admin');
