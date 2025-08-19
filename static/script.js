let qrReader; // Variable global para poder detenerlo

function initQRScanner() {
    qrReader = new Html5Qrcode("reader");

    qrReader.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        qrCodeMessage => {
            // Solicitar geolocalización al escanear el QR
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

                        // Solo detener el scanner si el QR es válido
                        if (data.estado === "VALIDO") {
                            qrReader.stop().then(() => console.log("Scanner detenido"));
                        }

                        // Si es inválido, el scanner sigue activo automáticamente
                    })
                    .catch(err => {
                        alert("Error al enviar datos: " + err);
                        // Mantener scanner activo en caso de error
                    });

                },
                (error) => {
                    alert("No se pudo obtener la ubicación: " + error.message);
                    // Mantener scanner activo en caso de fallo de geolocalización
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

// Iniciar scanner al cargar la página
window.addEventListener("DOMContentLoaded", () => {
    initQRScanner();
});
