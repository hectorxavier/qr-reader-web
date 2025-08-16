function initQRScanner() {
    const reader = new Html5Qrcode("reader");

    reader.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        qrCodeMessage => {
            const userLat = sessionStorage.getItem("user_lat");
            const userLon = sessionStorage.getItem("user_lon");

            if (!userLat || !userLon) {
                alert("No se pudo obtener la ubicación del usuario.");
                return;
            }

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
            })
            .catch(err => {
                alert("Error al enviar datos: " + err);
            });

        },
        errorMessage => {
            console.warn("QR no detectado:", errorMessage);
        }
    ).catch(err => {
        console.error("No se pudo iniciar el lector QR:", err);
    });
}

// Iniciar scanner solo si ya hay ubicación
window.addEventListener("DOMContentLoaded", () => {
    const userLat = sessionStorage.getItem("user_lat");
    const userLon = sessionStorage.getItem("user_lon");

    if (userLat && userLon) {
        initQRScanner();
    } else {
        console.log("Ubicación no encontrada. El usuario debe iniciar sesión primero.");
    }
});
