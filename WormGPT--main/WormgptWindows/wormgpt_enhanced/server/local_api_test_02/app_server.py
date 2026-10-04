
import http.server
import socketserver
import json
import os

PORT = 8000
DATA_FILE = "data_store.json"

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.path = '/client_page.html'
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        if self.path == '/add':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()

            count = 0
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, 'r') as f:
                    try:
                        data = json.load(f)
                        count = data.get('count', 0)
                    except json.JSONDecodeError:
                        pass
            
            count += 1
            with open(DATA_FILE, 'w') as f:
                json.dump({'count': count}, f)
            
            self.wfile.write(json.dumps({'count': count}).encode('utf-8'))
        else:
            self.send_error(404, "Not Found")

with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
    print(f"serving at port {PORT}")
    httpd.serve_forever()
