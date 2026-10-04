document.getElementById('fetchBtn').addEventListener('click', async () => {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = 'Cargando...';
    
    try {
        const response = await fetch('/api/data');
        if (!response.ok) {
            throw new Error(`Error en la petición: ${response.status}`);
        }
        const data = await response.json();
        resultDiv.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        resultDiv.textContent = `Error: ${error.message}`;
    }
});
