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

// Filtrado múltiple
function aplicarFiltros() {
    const usuarioFiltro = document.getElementById("filtro-usuario").value.toLowerCase();
    const gestorFiltro = document.getElementById("filtro-gestor").value;
    const adminFiltro = document.getElementById("filtro-admin").value;

    const filas = document.querySelectorAll("#usuarios-table tbody tr");

    filas.forEach(fila => {
        const username = fila.querySelector(".col-username").innerText.toLowerCase();
        const gestor = fila.querySelector(".col-gestor").innerText.toLowerCase();
        const admin = fila.querySelector(".col-admin").innerText.toLowerCase();

        let mostrar = true;

        // Filtro usuario
        if (usuarioFiltro && !username.includes(usuarioFiltro)) {
            mostrar = false;
        }

        // Filtro gestor
        if (gestorFiltro && gestor !== gestorFiltro) {
            mostrar = false;
        }

        // Filtro admin
        if (adminFiltro && admin !== adminFiltro) {
            mostrar = false;
        }

        fila.style.display = mostrar ? "" : "none";
    });
}

// Eventos
document.getElementById("filtro-usuario").addEventListener("keyup", aplicarFiltros);
document.getElementById("filtro-gestor").addEventListener("change", aplicarFiltros);
document.getElementById("filtro-admin").addEventListener("change", aplicarFiltros);

// Activar / Desactivar usuario
document.querySelectorAll(".btn-toggle").forEach(btn => {
    btn.addEventListener("click", async () => {
        const row = btn.closest("tr");
        const id = row.dataset.id;
        const activo = row.dataset.activo === "1"; // viene como string

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

