
import http.server
import socketserver
import os
import base64

PORT = 8000
DIRECTORY = "camera-test"
CAPTURES_DIR = os.path.join(DIRECTORY, "captures")

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_POST(self):
        if self.path == '/upload':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length).decode('utf-8')
            
            # Extract image data (base64)
            image_data_b64 = post_data.split(',')[1]
            image_data = base64.b64decode(image_data_b64)

            # Generate a unique filename
            filename = os.path.join(CAPTURES_DIR, f"capture_{len(os.listdir(CAPTURES_DIR)) + 1}.png")
            
            with open(filename, 'wb') as f:
                f.write(image_data)
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b"Foto guardada con exito!")
        else:
            super().do_POST()

    def do_GET(self):
        if self.path == '/':
            self.path = '/index.html'
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

if __name__ == "__main__":
    if not os.path.exists(CAPTURES_DIR):
        os.makedirs(CAPTURES_DIR)
    
    with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
        print(f"Sirviendo en el puerto {PORT} desde el directorio {DIRECTORY}")
        print(f"Accede a http://localhost:{PORT}")
        httpd.serve_forever()
