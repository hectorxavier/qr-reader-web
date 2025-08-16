// static/script.js
// Para que la validación de ubicación funcione, el QR debe tener el formato:
// https://www.google.com/maps/place/@LAT,LNG,zoom|NUMERO
// Ejemplo: https://www.google.com/maps/place/@-2.9000,-79.0000,17z|1234
// donde LAT y LNG son la latitud y longitud, y NUMERO es el número adicional a registrar.

let ultimaPosicion = null;
let escaneoActivo = false;

// Función para solicitar permiso de ubicación y escanear QR tras interacción del usuario
async function iniciarEscaneo() {
    const video = document.getElementById('preview');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const notificacion = document.getElementById('notificacion');

    // Mostrar mensaje al usuario solicitando permiso
    alert('Por favor, permita el acceso a su ubicación para poder registrar la asistencia.');

    // Solicitar ubicación tras interacción
    if (navigator.geolocation) {
        try {
            await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(pos => {
                    ultimaPosicion = pos.coords;
                    console.log('Ubicación inicial obtenida:', ultimaPosicion);
                    notificacion.textContent = `Ubicación obtenida: Lat ${ultimaPosicion.latitude.toFixed(6)}, Lng ${ultimaPosicion.longitude.toFixed(6)}`;
                    resolve();
                }, err => {
                    console.error('Error geolocalización:', err);
                    alert('No se pudo obtener la ubicación. Por favor, habilite los permisos en su dispositivo.');
                    reject(err);
                }, { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 });
            });
        } catch (err) {
            return; // Salir si no se obtuvo la ubicación
        }
    } else {
        alert('Geolocalización no soportada por su navegador');
        return;
    }

    // Iniciar cámara solo después de obtener ubicación
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        video.setAttribute('playsinline', true);
        await video.play();

        escaneoActivo = true;
        tick();

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
                    if (!ultimaPosicion) {
                        alert('Aún no se pudo obtener su ubicación. Intente de nuevo.');
                        requestAnimationFrame(tick);
                        return;
                    }
                    notificacion.textContent = `Ubicación actual: Lat ${ultimaPosicion.latitude.toFixed(6)}, Lng ${ultimaPosicion.longitude.toFixed(6)}`;
                    validarCercaniaYRegistrar(code.data, id_usuario, ultimaPosicion);
                    escaneoActivo = false;
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
            }
            if (escaneoActivo) {
                requestAnimationFrame(tick);
            }
        }

    } catch (err) {
        console.error('Error al acceder a la cámara:', err);
        alert('No se pudo acceder a la cámara. Asegúrate de usar HTTPS y permitir el acceso.');
    }
}
