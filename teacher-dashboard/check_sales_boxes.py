import re

file_path = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-centered/teacher-dashboard/panduan-scl-cabang.html'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

boxes = re.finditer(r'<div class="sales-box.*?>', html)
for i, match in enumerate(boxes):
    start = max(0, match.start() - 200)
    end = min(len(html), match.end() + 200)
    print(f"--- Box {i+1} ---")
    print(html[start:end])

