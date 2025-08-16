function onScanSuccess(decodedText, decodedResult) {
    document.getElementById('result').innerText = decodedText;
  
    // Enviar al backend
    fetch('/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: decodedText })
    })
    .then(response => response.json())
    .then(data => console.log(data));
  }
  
  function onScanFailure(error) {
    console.warn(`Escaneo fallido: ${error}`);
  }
  
  let html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
  html5QrcodeScanner.render(onScanSuccess, onScanFailure);
  