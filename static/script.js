let scanning = false;
let video = document.getElementById('preview');

document.getElementById('start-scan').addEventListener('click', async () => {
    if (scanning) return;
    scanning = true;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
        video.play();
        video.style.display = "block";

        // Aquí usar la librería de QR o tu método de escaneo
        // Simulación de lectura de QR:
        let qrCodeMessage = prompt("Simula lectura del QR:"); // Reemplazar con tu lector real

        if (qrCodeMessage) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const userLat = pos.coords.latitude;
                    const userLon = pos.coords.longitude;

                    const response = await fetch("/scan", {
                        method: "POST",
                        headers: {"Content-Type":"application/json"},
                        credentials: "same-origin",
                        body: JSON.stringify({ qr_data: qrCodeMessage, latitude: userLat, longitude: userLon })
                    });
                    const data = await response.json();
                    alert(`${data.message}\nDistancia: ${data.distancia_m} m`);

                    // Detener cámara
                    stream.getTracks().forEach(track => track.stop());
                    video.style.display = "none";
                    scanning = false;
                },
                (err) => {
                    alert("Error al obtener ubicación: " + err.message);
                    scanning = false;
                }
            );
        } else {
            stream.getTracks().forEach(track => track.stop());
            video.style.display = "none";
            scanning = false;
        }

    } catch (err) {
        alert("Error al acceder a la cámara: " + err.message);
        scanning = false;
    }
});
