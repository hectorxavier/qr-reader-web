function onScanSuccess(decodedText, decodedResult) {
  const person_id = document.getElementById('person_id').value;
  if (!person_id) {
      alert('Ingrese su ID antes de escanear');
      return;
  }

  document.getElementById('result').innerText = decodedText;

  fetch('/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id: person_id, qr_address: decodedText })
  })
  .then(res => res.json())
  .then(data => console.log(data));
}

function onScanFailure(error) {
  console.warn(`Escaneo fallido: ${error}`);
}

let html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
html5QrcodeScanner.render(onScanSuccess, onScanFailure);
