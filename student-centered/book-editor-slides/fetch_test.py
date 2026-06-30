import urllib.request
import json
import re

url = 'https://script.google.com/macros/s/AKfycbwvNSa3hUMNqhNOINDeG3cPUdlQM-dGfl-dDX5WejhESjHRALipqhwJ_-3HXOJehtWbWw/exec?course=python&level=3'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read().decode('utf-8'))
    for row in data:
        # Assuming row is a dict, search all values
        body = ' '.join(str(v) for v in row.values() if v)
        if 'Menambahkan Fungsionalitas Task Manager' in body:
            print("FOUND TASK MANAGER DATA!")
            for k, v in row.items():
                if v and 'Menambahkan Fungsionalitas Task Manager' in str(v):
                    lines = str(v).split('\n')
                    idx = next((i for i, l in enumerate(lines) if 'Langkah 5:' in l), -1)
                    if idx != -1:
                        print(f"--- MATCH IN COLUMN {k} ---")
                        print('\n'.join(lines[max(0, idx-10):min(len(lines), idx+10)]))
except Exception as e:
    print("Error:", e)
