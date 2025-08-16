// ---------------------------------------------
// Función que se llama cuando se escanea un QR
// ---------------------------------------------
function handleScanSuccess(qrMessage) {
    if (!qrMessage) return;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                // Crear objeto con datos a enviar
                const payload = {
                    qr_data: qrMessage,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };

                // Enviar al backend
                fetch("/scan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                })
                .then(res => res.json())
                .then(data => {
                    if (data.estado) {
                        alert(`${data.message}\nDistancia: ${data.distancia_m} m`);
                    } else {
                        alert("Error al procesar el QR.");
                    }
                })
                .catch(err => {
                    console.error("Error al enviar datos:", err);
                    alert("Error de comunicación con el servidor.");
                });
            },
            function(error) {
                console.error("Error geolocalización:", error);
                alert("No se pudo obtener la ubicación: " + error.message);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        alert("Este navegador no soporta geolocalización.");
    }
}

// ---------------------------------------------
// Configuración de HTML5 QR Code Scanner
// ---------------------------------------------
function initQRScanner() {
    const html5QrCode = new Html5Qrcode("reader"); // ID del div en index.html

    const qrConfig = { fps: 10, qrbox: 250 };

    html5QrCode.start(
        { facingMode: "environment" },
        qrConfig,
        handleScanSuccess
    ).catch(err => {
        console.error("Error al iniciar el escáner QR:", err);
        alert("No se pudo iniciar el escáner QR.");
    });
}

// Inicializar escáner al cargar la página
window.addEventListener("load", initQRScanner);
