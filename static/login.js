document.getElementById('btn-location').addEventListener('click', () => {

    if (!navigator.geolocation) {
        alert("Este navegador no soporta geolocalización.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            console.log('Lat:', lat, 'Lon:', lon);

            // Guardar la ubicación en sessionStorage para usar después en el escaneo
            sessionStorage.setItem('user_lat', lat);
            sessionStorage.setItem('user_lon', lon);

            // Obtener valores del formulario
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // Enviar login al backend
            fetch('/login', {
                method: 'POST',
                headers: {'Content-Type':'application/x-www-form-urlencoded'},
                body: new URLSearchParams({username, password})
            })
            .then(res => {
                if(res.redirected){
                    window.location.href = res.url;
                } else {
                    res.text().then(txt => alert(txt));
                }
            })
            .catch(err => alert('Error de conexión: ' + err));

        },
        (error) => {
            alert('No se pudo obtener la ubicación: ' + error.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
});
