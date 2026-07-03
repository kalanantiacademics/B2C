import re

file_path = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-centered/teacher-dashboard/panduan-scl-cabang.html'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Add the css rule to the <style> block
style_end = html.find('</style>')
if style_end != -1:
    css_to_add = '''
        /* Ensure all direct children of slide are vertically centered */
        .slide > div:first-child {
            margin-top: auto;
            margin-bottom: auto;
        }
    '''
    # Clean up old my-auto classes
    html = html.replace(' my-auto', '')
    html = html.replace('class="my-auto ', 'class="')
    
    html = html[:style_end] + css_to_add + html[style_end:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("CSS vertical centering fix applied globally.")
