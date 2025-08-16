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
  })
  .catch(error => {
      console.error('Error al registrar asistencia:', error);
      alert('Hubo un error al registrar la asistencia');
  });
}
