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
                        startScanner();
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

                                if (data.estado !== "VALIDO") startScanner();
                            } catch (err) {
                                alert("Error al enviar datos: " + err);
                                startScanner();
                            }
                        },
                        error => {
                            alert("No se pudo obtener la ubicación: " + error.message);
                            startScanner();
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
            setTimeout(startScanner, 2000);
        }
    }

    startScanner();
}

// Iniciar scanner al cargar la página
window.addEventListener("DOMContentLoaded", initQRScanner);

// Filtrado múltiple
function aplicarFiltros() {
    const usuarioFiltro = document.getElementById("filtro-usuario").value.toLowerCase();
    const gestorFiltro = document.getElementById("filtro-gestor").value.toLowerCase();
    const adminFiltro = document.getElementById("filtro-admin").value.toLowerCase();

    const filas = document.querySelectorAll("#usuarios-table tbody tr");

    filas.forEach(fila => {
        const username = fila.dataset.username.toLowerCase();
        const gestor = fila.dataset.canview === "1" ? "sí" : "no";
        const admin = fila.dataset.isadmin === "1" ? "sí" : "no";

        let mostrar = true;

        // Filtro usuario
        if (usuarioFiltro && !username.includes(usuarioFiltro)) {
            mostrar = false;
        }

        // Filtro gestor
        if (gestorFiltro && gestorFiltro !== "" && gestor !== gestorFiltro) {
            mostrar = false;
        }

        // Filtro admin
        if (adminFiltro && adminFiltro !== "" && admin !== adminFiltro) {
            mostrar = false;
        }

        fila.style.display = mostrar ? "" : "none";
    });
}

// Eventos filtros
document.getElementById("filtro-usuario").addEventListener("keyup", aplicarFiltros);
document.getElementById("filtro-gestor").addEventListener("change", aplicarFiltros);
document.getElementById("filtro-admin").addEventListener("change", aplicarFiltros);

// Activar / Desactivar usuario
document.querySelectorAll(".btn-toggle").forEach(btn => {
    btn.addEventListener("click", async () => {
        const row = btn.closest("tr");
        const id = row.dataset.id;
        const activo = row.dataset.activo === "1";

        const accion = activo ? "desactivar" : "activar";
        if(!confirm(`¿Seguro que desea ${accion} este usuario?`)) return;

        const res = await fetch(`/usuarios/toggle/${id}`, { method: "POST" });

        if(res.ok) location.reload();
        else {
            const msg = await res.text();
            alert("Error al actualizar usuario: " + msg);
        }
    });
});
