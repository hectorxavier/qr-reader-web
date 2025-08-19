let qrReader; // Variable global

function initQRScanner() {
    qrReader = new Html5Qrcode("reader");

    function startScanner() {
        qrReader.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            qrCodeMessage => {
                // Detener el escáner mientras procesamos
                qrReader.stop().then(() => console.log("Scanner detenido"));

                // Obtener geolocalización
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

                            // Si el QR es inválido, reiniciamos el escáner
                            if (data.estado !== "VALIDO") {
                                startScanner();
                            }
                        })
                        .catch(err => {
                            alert("Error al enviar datos: " + err);
                            // Reiniciar el escáner tras error
                            startScanner();
                        });

                    },
                    (error) => {
                        alert("No se pudo obtener la ubicación: " + error.message);
                        // Reiniciar el escáner si falla la ubicación
                        startScanner();
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

    startScanner();
}

// Iniciar scanner al cargar la página
window.addEventListener("DOMContentLoaded", () => {
    initQRScanner();
});
