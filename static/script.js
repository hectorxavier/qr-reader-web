// static/script.js
async function iniciarEscaneo() {
    const video = document.getElementById('preview');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const notificacion = document.getElementById('notificacion');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        video.setAttribute('playsinline', true);
        video.play();

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
                    if (id_usuario) {
                        validarCercaniaYRegistrar(code.data, id_usuario);
                        stream.getTracks().forEach(track => track.stop());
                        return;
                    } else {
                        alert('Ingrese su ID antes de escanear');
                    }
                }
            }
            requestAnimationFrame(tick);
        }

    } catch (err) {
        console.error('Error al acceder a la cámara:', err);
        alert('No se pudo acceder a la cámara. Asegúrate de usar HTTPS y permitir el acceso.');
    }
}

function validarCercaniaYRegistrar(qrText, id_usuario) {
    const partes = qrText.split('|');
    const linkQR = partes[0];
    const numero_qr = partes.length > 1 ? partes[1] : '';

    // Extraer coordenadas del link de Google Maps
    const match = linkQR.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (!match) {
        alert('Formato de link incorrecto. No se puede validar la ubicación.');
        return;
    }
    const latQR = parseFloat(match[1]);
    const lngQR = parseFloat(match[2]);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            const latUser = pos.coords.latitude;
            const lngUser = pos.coords.longitude;

            const distancia = distanciaMetros(latUser, lngUser, latQR, lngQR);
            const tolerancia = 50; // metros

            if (distancia <= tolerancia) {
                // Registrar asistencia porque está cerca
                fetch('/asistencia', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_usuario, numero_qr })
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Asistencia registrada:', data);
                    document.getElementById('notificacion').textContent = 'QR leído y asistencia registrada correctamente';
                })
                .catch(error => {
                    console.error('Error al registrar asistencia:', error);
                    alert('Hubo un error al registrar la asistencia');
                });
            } else {
                document.getElementById('notificacion').textContent = 'Usted no está en la ubicación de la agencia';
            }

        }, err => {
            console.error('Error obteniendo geolocalización:', err);
            alert('No se pudo obtener su ubicación');
        });
    } else {
        alert('Geolocalización no soportada por su navegador');
    }
}

function distanciaMetros(lat1, lng1, lat2, lng2) {
    const R = 6371000; // metros
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Función para filtrar registros por fecha y usuario y descargar en TXT
function filtrarYDescargar() {
    const fecha = document.getElementById('filtro_fecha').value;
    const usuario = document.getElementById('filtro_usuario').value;

    fetch(`/asistencia?fecha=${encodeURIComponent(fecha)}&usuario=${encodeURIComponent(usuario)}`)
    .then(response => response.json())
    .then(data => {
        let contenido = 'ID\tUsuario\tFecha\tHora\tNúmero QR\n';
        data.forEach(item => {
            contenido += `${item.id}\t${item.id_usuario}\t${item.fecha}\t${item.hora}\t${item.numero_qr}\n`;
        });

        const blob = new Blob([contenido], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'registros_asistencia.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    })
    .catch(error => console.error('Error al filtrar registros:', error));
}
