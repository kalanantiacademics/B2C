import re

file_path = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-centered/teacher-dashboard/panduan-scl-cabang.html'
with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

# find all flex-row containers that contain a sales-box
boxes = re.finditer(r'<div class="sales-box.*?>', html)
for match in boxes:
    idx = match.start()
    # find the previous 'class="planet-card' or flex-row container
    start_container = html.rfind('<div class="planet-card', 0, idx)
    if start_container != -1:
        # Check if flex-row is in this container
        container_tag = html[start_container:html.find('>', start_container)]
        if 'flex-row' in container_tag:
            print(f"Found sales-box inside flex-row at index {idx}")
            print(html[start_container:idx + 100])
            print("-" * 50)
