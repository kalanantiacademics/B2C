from waitress import serve
from app import app
import logging

logging.basicConfig(level=logging.INFO)
print("Starting Waitress server on port 5002...")
serve(app, host='127.0.0.1', port=5002)
