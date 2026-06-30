import urllib.request, json
try:
    r_data = urllib.request.urlopen('http://127.0.0.1:5005/api/book?course=roblox&level=1').read()
    s_data = urllib.request.urlopen('http://127.0.0.1:5005/api/book?course=scratch&level=1').read()
    print("Roblox length:", len(r_data))
    print("Scratch length:", len(s_data))
except Exception as e:
    print("Error:", e)
