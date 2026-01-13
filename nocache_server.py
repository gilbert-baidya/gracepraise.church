#!/usr/bin/env python3
"""
Simple HTTP server with aggressive no-cache headers for mobile testing
"""
from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

class NoCacheHTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Aggressive no-cache headers
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        SimpleHTTPRequestHandler.end_headers(self)
    
    def log_message(self, format, *args):
        # Simplified logging
        print(f"[{self.address_string()}] {format % args}")

if __name__ == '__main__':
    PORT = 8000
    os.chdir('/Users/gbaidya/Documents/Project cool/Calendar 2026')
    
    server = HTTPServer(('0.0.0.0', PORT), NoCacheHTTPRequestHandler)
    print(f"✓ No-cache server running on port {PORT}")
    print(f"✓ Mobile access: http://192.168.4.104:{PORT}/index.html")
    print(f"✓ Press Ctrl+C to stop")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n✓ Server stopped")
        server.shutdown()
