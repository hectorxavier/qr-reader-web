function procesarQR(qrText, id_usuario) {
    const partes = qrText.split('/');
    const numero_qr = partes[partes.length - 1];

    fetch('/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_usuario, numero_qr })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Asistencia registrada:', data);
        alert('Asistencia registrada correctamente');
        mostrarAsistencias();
    })
    .catch(error => {
        console.error('Error al registrar asistencia:', error);
        alert('Hubo un error al registrar la asistencia');
    });
}

function mostrarAsistencias() {
    fetch('/asistencia')
    .then(response => response.json())
    .then(data => {
        console.log('Registros actuales:', data);
        const lista = document.getElementById('lista-asistencias');
        lista.innerHTML = '';
        data.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `ID: ${item.id}, Usuario: ${item.id_usuario}, Fecha: ${item.fecha}, Hora: ${item.hora}, Número QR: ${item.numero_qr}`;
            lista.appendChild(li);
        });
    })
    .catch(error => console.error('Error al obtener registros:', error));
}
