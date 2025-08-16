async function iniciarEscaneo() {
    const video = document.getElementById('preview');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

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
