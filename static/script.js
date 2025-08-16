function handleScanSuccess(qrMessage) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            fetch("/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    qr_data: qrMessage,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                })
            })
            .then(res => res.json())
            .then(data => {
                alert(data.message + " (Distancia: " + data.distancia_m + "m)");
            });
        }, function(error) {
            alert("Error obteniendo ubicación: " + error.message);
        });
    } else {
        alert("Este navegador no soporta geolocalización.");
    }
}
