// static/script.js
// Para que la validación de ubicación funcione, el QR debe tener el formato:
// https://www.google.com/maps/place/@LAT,LNG,zoom|NUMERO
// Ejemplo: https://www.google.com/maps/place/@-2.9000,-79.0000,17z|1234
// donde LAT y LNG son la latitud y longitud, y NUMERO es el número adicional a registrar.

let ultimaPosicion = null;

async function iniciarEscaneo() {
    const video = document.getElementById('preview');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const notificacion = document.getElementById('notificacion');

    // Obtener ubicación continuamente para asegurar disponibilidad
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(pos => {
            ultimaPosicion = pos.coords;
            console.log('Ubicación actualizada:', ultimaPosicion);
        }, err => {
            console.error('Error geolocalización:', err);
            alert('No se pudo obtener la ubicación. Por favor, habilite los permisos.');
        }, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
    } else {
        alert('Geolocalización no soportada por su navegador');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        video.setAttribute('playsinline', true);
        await video.play();

        requestAnimationFrame(tick);

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
                        return;
                    }
                    if (!ultimaPosicion) {
                        alert('Aún no se pudo obtener su ubicación. Intente de nuevo.');
                        return;
                    }
                    validarCercaniaYRegistrar(code.data, id_usuario, ultimaPosicion);
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
            }
            requestAnimationFrame(tick);
        }
    } catch (err) {
        console.error('Error al acceder a la cámara:', err);
        alert('No se pudo acceder a la cámara. Asegúrate de usar HTTPS y permitir el acceso.');
    }
}
