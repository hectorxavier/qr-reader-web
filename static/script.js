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
                        procesarQR(code.data, id_usuario);
                        // Mostrar notificación
                        notificacion.textContent = 'QR leído y asistencia registrada correctamente';
                        // Detener cámara después del escaneo
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

function procesarQR(qrText, id_usuario) {
    const partes = qrText.split('/');
    const numero_qr = partes[partes.length - 1];

    fetch('/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_usuario, numero_qr })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Asistencia registrada:', data);
    })
    .catch(error => {
        console.error('Error al registrar asistencia:', error);
        alert('Hubo un error al registrar la asistencia');
    });
}