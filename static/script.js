let qrReader;

function initQRScanner() {
    qrReader = new Html5Qrcode("reader");

    qrReader.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        qrCodeMessage => {

            if (!navigator.geolocation) {
                alert("Este navegador no soporta geolocalización.");
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLon = position.coords.longitude;

                    fetch("/scan", {
                        method: "POST",
                        headers: {"Content-Type":"application/json"},
                        body: JSON.stringify({
                            qr_data: qrCodeMessage,
                            latitude: userLat,
                            longitude: userLon
                        })
                    })
                    .then(res => res.json())
                    .then(data => {
                        alert(`${data.message}\nDistancia: ${data.distancia_m} m`);

                        // Detener solo si el servidor confirma que el QR es válido
                        if (data.estado === "VALIDO") {
                            qrReader.stop().then(() => console.log("Scanner detenido"));
                        }
                        // Si es INVÁLIDO, el scanner sigue activo automáticamente
                    })
                    .catch(err => {
                        console.error("Error al enviar datos:", err);
                        // Mantener scanner activo en caso de error
                    });

                },
                (error) => {
                    alert("No se pudo obtener la ubicación: " + error.message);
                    // Mantener scanner activo si falla geolocalización
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        },
        errorMessage => {
            console.warn("QR no detectado:", errorMessage);
        }
    ).catch(err => {
        console.error("No se pudo iniciar el lector QR:", err);
    });
}

window.addEventListener("DOMContentLoaded", () => {
    initQRScanner();
});
