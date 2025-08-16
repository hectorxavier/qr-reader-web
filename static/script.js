// static/script.js
// Mejoras: notificación al usuario, manejo de errores iOS, timeout y visualización de ubicación.

let ultimaPosicion = null;
let escaneoActivo = false;
let timeoutEscaneo = null;

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnEscanear');
    const video = document.getElementById('preview');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const notificacion = document.getElementById('notificacion');
    const ubicacionDisplay = document.getElementById('ubicacion'); // Elemento para mostrar coordenadas

    if (!btn) {
        console.error('No se encontró el botón btnEscanear');
        return;
    }

    btn.addEventListener('click', async () => {
        if (!navigator.geolocation) {
            alert('Geolocalización no soportada por su navegador');
            return;
        }

        // Obtener ubicación inicial
        try {
            ultimaPosicion = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    pos => resolve(pos.coords),
                    err => reject(err),
                    { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
                );
            });
            ubicacionDisplay.textContent = `Ubicación actual: Lat ${ultimaPosicion.latitude.toFixed(6)}, Lng ${ultimaPosicion.longitude.toFixed(6)}`;
        } catch (err) {
            alert('No se pudo obtener la ubicación. Habilite los permisos y recargue la página.');
            return;
        }

        // Monitorear cambios en la ubicación
        navigator.geolocation.watchPosition(pos => {
            ultimaPosicion = pos.coords;
            ubicacionDisplay.textContent = `Ubicación actual: Lat ${ultimaPosicion.latitude.toFixed(6)}, Lng ${ultimaPosicion.longitude.toFixed(6)}`;
        }, err => {
            console.error('Error al actualizar ubicación:', err);
        }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 });

        // Acceder a la cámara
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = stream;
            video.setAttribute('playsinline', true);
            await video.play();

            escaneoActivo = true;
            timeoutEscaneo = setTimeout(() => {
                if (escaneoActivo) {
                    escaneoActivo = false;
                    stream.getTracks().forEach(track => track.stop());
                    notificacion.textContent = 'Tiempo de escaneo agotado';
                }
            }, 60000); // 60 segundos de timeout

            function tick() {
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);

                    if (code) {
                        const id_usuario = document.getElementById('id_usuario').value;
                        if (!id_usuario) {
                            alert('Ingrese su ID antes de escanear');
                            requestAnimationFrame(tick);
                            return;
                        }

                        notificacion.textContent = `QR detectado. Validando ubicación...`;
                        validarCercaniaYRegistrar(code.data, id_usuario, ultimaPosicion.latitude, ultimaPosicion.longitude);

                        escaneoActivo = false;
                        clearTimeout(timeoutEscaneo);
                        stream.getTracks().forEach(track => track.stop());
                        return;
                    }
                }
                if (escaneoActivo) {
                    requestAnimationFrame(tick);
                }
            }

            requestAnimationFrame(tick);

        } catch (err) {
            alert('No se pudo acceder a la cámara. Asegúrate de usar HTTPS y permitir el acceso.');
        }
    });
});

function validarCercaniaYRegistrar(qrText, id_usuario, latUser, lngUser) {
    const partes = qrText.split('|');
    if (partes.length < 2) {
        alert('Formato de link incorrecto. Debe incluir coordenadas y número separados por "|"');
        return;
    }

    const linkQR = partes[0];
    const numero_qr = partes[1];

    const match = linkQR.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (!match) {
        alert('Formato de link incorrecto. No se puede validar la ubicación.');
        return;
    }

    const latQR = parseFloat(match[1]);
    const lngQR = parseFloat(match[2]);

    const distancia = distanciaMetros(latUser, lngUser, latQR, lngQR);
    const tolerancia = 50;

    if (distancia <= tolerancia) {
        fetch('/asistencia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario, numero_qr })
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('notificacion').textContent = 'QR leído y asistencia registrada correctamente';
            console.log('Asistencia registrada:', data);
        })
        .catch(error => {
            console.error('Error al registrar asistencia:', error);
            alert('Hubo un error al registrar la asistencia');
        });
    } else {
        document.getElementById('notificacion').textContent = 'Usted no está en la ubicación de la agencia';
    }
}

function distanciaMetros(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
