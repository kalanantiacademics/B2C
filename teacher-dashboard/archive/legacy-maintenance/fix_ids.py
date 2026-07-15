import re

file_path = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-centered/teacher-dashboard/panduan-scl-cabang.html'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

parts = re.split(r'(<!-- SLIDE 1: .*?-->)', html, maxsplit=1)
header = parts[0]
slides_content = parts[1] + parts[2]

slides_parts = re.split(r'(<script>)', slides_content, maxsplit=1)
slides_html = slides_parts[0]
footer = slides_parts[1] + slides_parts[2]

# Split by <!-- SLIDE 1:
slides = re.split(r'(?=<!-- SLIDE 1:)', slides_html)
slides = [s for s in slides if s.strip()]

final_slides = []
current_num = 1
for s in slides:
    # replace <!-- SLIDE 1: with current_num
    s = re.sub(r'<!-- SLIDE 1:', f'<!-- SLIDE {current_num}:', s)
    # replace id="slide-1" with current_num
    s = re.sub(r'id="slide-1"', f'id="slide-{current_num}"', s)
    
    final_slides.append(s)
    current_num += 1

new_slides_html = "".join(final_slides)

final_html = header + new_slides_html + footer

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(final_html)

print(f"Fixed {current_num - 1} slides")
