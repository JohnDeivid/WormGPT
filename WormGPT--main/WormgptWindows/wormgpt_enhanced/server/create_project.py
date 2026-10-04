import os
import json

os.makedirs('agent_test_05', exist_ok=True)

# 1. config.json
config_data = {
    "app_name": "Agent Test 05 App",
    "version": "1.0.0",
    "status": "online",
    "message": "¡Hola desde el servidor Python! Datos leídos correctamente de config.json.",
    "server_tech": "Python http.server (Librería Estándar)"
}
with open('agent_test_05/config.json', 'w', encoding='utf-8') as f:
    json.dump(config_data, f, indent=2, ensure_ascii=False)

# 2. index.html
index_html = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Test 05</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Agent Test 05</h1>
        <p>Haz clic en el botón para consultar el servidor Python.</p>
        <button id="fetchBtn">Obtener Datos Config</button>
        <pre id="output">Los datos aparecerán aquí...</pre>
    </div>
    <script src="app.js"></script>
</body>
</html>
"""
with open('agent_test_05/index.html', 'w', encoding='utf-8') as f:
    f.write(index_html)

# 3. style.css
style_css = """body {
    font-family: Arial, sans-serif;
    background-color: #0f172a;
    color: #f8fafc;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    margin: 0;
}

.container {
    background-color: #1e293b;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
    max-width: 500px;
    width: 100%;
    text-align: center;
}

h1 {
    color: #38bdf8;
    margin-top: 0;
}

button {
    background-color: #0284c7;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s;
}

button:hover {
    background-color: #0369a1;
}

pre {
    background-color: #0f172a;
    padding: 1rem;
    border-radius: 6px;
    text-align: left;
    overflow-x: auto;
    margin-top: 1.5rem;
    color: #4ade80;
    border: 1px solid #334155;
}
"""
with open('agent_test_05/style.css', 'w', encoding='utf-8') as f:
    f.write(style_css)

# 4. app.js
app_js = """document.getElementById('fetchBtn').addEventListener('click', async () => {
    const output = document.getElementById('output');
    output.textContent = 'Cargando datos...';
    try {
        const response = await fetch('/api/data');
        if (!response.ok) {
            throw new Error(`Error en el servidor: ${response.status}`);
        }
        const data = await response.json();
        output.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        output.textContent = `Error: ${error.message}`;
    }
});
"""
with open('agent_test_05/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

# 5. server.py
server_py = """import http.server
import socketserver
import json
import os

PORT = 8000

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/data':
            config_path = os.path.join(os.path.dirname(__file__), 'config.json')
            if os.path.exists(config_path):
                try:
                    with open(config_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
                except Exception as e:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            else:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'config.json no encontrado'}).encode('utf-8'))
        else:
            super().do_GET()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"Servidor corriendo en http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\\nServidor detenido.")
"""
with open('agent_test_05/server.py', 'w', encoding='utf-8') as f:
    f.write(server_py)

print("Estructura de agent_test_05/ creada correctamente.")
