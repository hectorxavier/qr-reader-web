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

// Esperar que el DOM cargue
document.addEventListener("DOMContentLoaded", () => {
    initQRScanner(); // <-- Scanner intacto

    // --- Función para sincronizar radios ---
    function syncCanViewLogs(adminRadios, viewRadios) {
        if(adminRadios[0].checked) { // Sí admin
            viewRadios[0].checked = true;
            viewRadios[0].disabled = true;
            viewRadios[1].disabled = true;
        } else { // No admin
            viewRadios[0].disabled = false;
            viewRadios[1].disabled = false;
        }
    }

    // --- Radios agregar usuario ---
    const addAdminRadios = [
        document.querySelector('input[name="is_admin"][value="1"]'), 
        document.querySelector('input[name="is_admin"][value="0"]')
    ];
    const addViewRadios = [
        document.querySelector('input[name="can_view_logs"][value="1"]'), 
        document.querySelector('input[name="can_view_logs"][value="0"]')
    ];
    addAdminRadios.forEach(r => r.addEventListener("change", () => syncCanViewLogs(addAdminRadios, addViewRadios)));
    syncCanViewLogs(addAdminRadios, addViewRadios);

    // --- Agregar usuario ---
    const formAdd = document.getElementById("form-add-user");
    formAdd.addEventListener("submit", async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(formAdd));
        data.is_admin = addAdminRadios[0].checked ? 1 : 0;
        data.can_view_logs = addViewRadios[0].checked ? 1 : 0;

        const res = await fetch("/usuarios/add", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify(data)
        });

        if(res.ok) location.reload();
        else {
            const msg = await res.text();
            alert("Error al agregar usuario: " + msg);
        }
    });

    // --- Modal edición ---
    const editAdminRadios = [document.getElementById("edit-isadmin-si"), document.getElementById("edit-isadm]()
