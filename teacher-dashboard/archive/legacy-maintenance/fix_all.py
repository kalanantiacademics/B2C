import re

file_path = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-centered/teacher-dashboard/panduan-scl-cabang.html'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Fix Button Alignment
# Revert the accidental replace
nav_btn_bad = '''        .nav-btn {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: var(--card);
            border: 2px solid var(--card-b);
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: flex-start; /* Fixed for overflow */
            font-size: 1.5rem;
            color: var(--text-heading);
            transition: all 0.2s;
            backdrop-filter: blur(10px);
        }'''

nav_btn_good = '''        .nav-btn {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: var(--card);
            border: 2px solid var(--card-b);
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: var(--text-heading);
            transition: all 0.2s;
            backdrop-filter: blur(10px);
        }'''

html = html.replace(nav_btn_bad, nav_btn_good)

# 2. Add 'my-auto' to ALL direct children of .slide to fix vertical centering
def add_my_auto(match):
    prefix = match.group(1)
    tag = match.group(2)
    # Check if 'my-auto' is already in there
    if 'my-auto' not in tag:
        # insert 'my-auto' into the class attribute
        if 'class="' in tag:
            tag = tag.replace('class="', 'class="my-auto ')
        else:
            tag = tag.replace('<div', '<div class="my-auto"')
    return prefix + tag

html = re.sub(r'(<div class="slide"[^>]*>\s*)(<div[^>]*>)', add_my_auto, html)

# 3. Add link to Slide 27
# Let's find Slide 27 content
link_html = '''
            <div class="mt-8 text-center">
                <a href="https://drive.google.com/drive/folders/1l8JrYIrLfNKP2I09Ttae3IkrW9jil-Ma?usp=sharing" target="_blank" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transform transition hover:scale-105">
                    <span>📄</span> Lihat Kumpulan Modul SCL Kalananti
                </a>
            </div>
'''
# I'll inject this right before the </div> closing the max-w-4xl wrapper in slide 27
# Let's find slide 27
slide_27_start = html.find('<!-- SLIDE 27:')
if slide_27_start != -1:
    slide_28_start = html.find('<!-- SLIDE 28:', slide_27_start)
    if slide_28_start == -1: slide_28_start = len(html)
    slide_27_html = html[slide_27_start:slide_28_start]
    
    # inject the link at the bottom of the slide's content wrapper
    # The wrapper is usually closed by the last </div></div> sequence
    # Let's just insert it before the last two </div>'s
    parts = slide_27_html.rsplit('</div>', 2)
    if len(parts) >= 2:
        new_slide_27_html = parts[0] + link_html + '\n        </div>' + parts[1] + '</div>' + (parts[2] if len(parts)>2 else "")
        html = html[:slide_27_start] + new_slide_27_html + html[slide_28_start:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("All fixes applied successfully.")
