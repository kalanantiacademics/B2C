from waitress import serve

from app import app

print("Starting Waitress server on port 5005...")
serve(app, host="127.0.0.1", port=5005)
