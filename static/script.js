// Función para inicializar el lector QR
function initQRScanner() {
    const reader = new Html5Qrcode("reader");

    reader.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: 250
        },
        qrCodeMessage => {
            // Obtener la ubicación almacenada en sessionStorage
            const userLat = sessionStorage.getItem("user_lat");
            const userLon = sessionStorage.getItem("user_lon");

            if (!userLat || !userLon) {
                alert("No se pudo obtener la ubicación del usuario.");
                return;
            }

            // Enviar QR + ubicación al backend
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

            // Opcional: detener el lector después del primer escaneo
            // reader.stop().then(() => console.log("Scanner detenido"));
        },
        errorMessage => {
            // Puedes mostrar errores de escaneo en consola si quieres
            console.warn("QR no detectado:", errorMessage);
        }
    ).catch(err => {
        console.error("No se pudo iniciar el lector QR:", err);
    });
}

// Iniciar scanner automáticamente si ya hay ubicación guardada
window.addEventListener("DOMContentLoaded", () => {
    const userLat = sessionStorage.getItem("user_lat");
    const userLon = sessionStorage.getItem("user_lon");

    if (userLat && userLon) {
        initQRScanner();
    } else {
        console.log("Ubicación no encontrada. El usuario debe iniciar sesión primero.");
    }
});
