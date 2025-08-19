let qrReader; // Variable global

function initQRScanner() {
    qrReader = new Html5Qrcode("reader");

    async function startScanner() {
        try {
            await qrReader.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: 250 },
                async qrCodeMessage => {
                    await qrReader.stop();
                    console.log("Scanner detenido");

                    if (!navigator.geolocation) {
                        alert("Este navegador no soporta geolocalización.");
                        startScanner(); // Reinicia
                        return;
                    }

                    navigator.geolocation.getCurrentPosition(
                        async position => {
                            const userLat = position.coords.latitude;
                            const userLon = position.coords.longitude;

                            try {
                                const res = await fetch("/scan", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        qr_data: qrCodeMessage,
                                        latitude: userLat,
                                        longitude: userLon
                                    })
                                });
                                const data = await res.json();
                                alert(`${data.message}\nDistancia: ${data.distancia_m} m`);

                                // Reinicia el escáner si el QR es inválido
                                if (data.estado !== "VALIDO") startScanner();
                            } catch (err) {
                                alert("Error al enviar datos: " + err);
                                startScanner(); // Reinicia tras error
                            }
                        },
                        error => {
                            alert("No se pudo obtener la ubicación: " + error.message);
                            startScanner(); // Reinicia tras error de ubicación
                        },
                        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                    );
                },
                errorMessage => {
                    console.warn("QR no detectado:", errorMessage);
                }
            );
        } catch (err) {
            console.error("No se pudo iniciar el lector QR:", err);
            setTimeout(startScanner, 2000); // Intentar de nuevo tras 2s
        }
    }

    startScanner();
}

// Iniciar scanner al cargar la página
window.addEventListener("DOMContentLoaded", initQRScanner);
