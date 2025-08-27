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
    initQRScanner();

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
    const addAdminRadios = [document.querySelector('input[name="is_admin"][value="1"]'), 
                            document.querySelector('input[name="is_admin"][value="0"]')];
    const addViewRadios = [document.querySelector('input[name="can_view_logs"][value="1"]'), 
                            document.querySelector('input[name="can_view_logs"][value="0"]')];
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
    const editAdminRadios = [document.getElementById("edit-isadmin-si"), document.getElementById("edit-isadmin-no")];
    const editViewRadios = [document.getElementById("edit-canview-si"), document.getElementById("edit-canview-no")];
    let currentEditId = null;

    document.querySelectorAll(".btn-edit").forEach(btn => {
        btn.addEventListener("click", () => {
            const row = btn.closest("tr");
            currentEditId = row.dataset.id;
            document.getElementById("edit-id").value = currentEditId;
            document.getElementById("edit-username").value = row.dataset.username;
            editAdminRadios[0].checked = row.dataset.isadmin === "1";
            editAdminRadios[1].checked = row.dataset.isadmin === "0";
            editViewRadios[0].checked = row.dataset.canview === "1";
            editViewRadios[1].checked = row.dataset.canview === "0";
            syncCanViewLogs(editAdminRadios, editViewRadios);
        });
    });

    editAdminRadios.forEach(r => r.addEventListener("change", () => syncCanViewLogs(editAdminRadios, editViewRadios)));

    // --- Editar usuario ---
    const formEdit = document.getElementById("form-edit-user");
    formEdit.addEventListener("submit", async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(formEdit));
        data.is_admin = editAdminRadios[0].checked ? 1 : 0;
        data.can_view_logs = editViewRadios[0].checked ? 1 : 0;

        const res = await fetch(`/usuarios/edit/${currentEditId}`, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify(data)
        });

        if(res.ok) location.reload();
        else {
            const msg = await res.text();
            alert("Error al editar usuario: " + msg);
        }
    });

    // --- Activar / Desactivar usuario ---
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

    // --- Filtrado múltiple ---
    function aplicarFiltros() {
        const usuarioFiltro = document.getElementById("filtro-usuario").value.toLowerCase();
        const gestorFiltro = document.getElementById("filtro-gestor").value.toLowerCase();
        const adminFiltro = document.getElementById("filtro-admin").value.toLowerCase();

        document.querySelectorAll("#usuarios-table tbody tr").forEach(fila => {
            const username = fila.dataset.username.toLowerCase();
            const gestor = fila.dataset.canview === "1" ? "sí" : "no";
            const admin = fila.dataset.isadmin === "1" ? "sí" : "no";

            let mostrar = true;
            if (usuarioFiltro && !username.includes(usuarioFiltro)) mostrar = false;
            if (gestorFiltro && gestorFiltro !== "" && gestor !== gestorFiltro) mostrar = false;
            if (adminFiltro && adminFiltro !== "" && admin !== adminFiltro) mostrar = false;

            fila.style.display = mostrar ? "" : "none";
        });
    }

    document.getElementById("filtro-usuario").addEventListener("keyup", aplicarFiltros);
    document.getElementById("filtro-gestor").addEventListener("change", aplicarFiltros);
    document.getElementById("filtro-admin").addEventListener("change", aplicarFiltros);

});
