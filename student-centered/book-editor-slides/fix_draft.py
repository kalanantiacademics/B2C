import json
import re

draft_path = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-centered/book-editor-slides/saved_books/drafts/python_level_3.json'
with open(draft_path, 'r') as f:
    data = json.load(f)

changed = False
for i, el in enumerate(data['elements']):
    html = el.get('html', '') if isinstance(el, dict) else el
    
    if 'Langkah 5: Menambahkan Fungsionalitas Task Manager' in html and '<pre class=\"syntax-block\">' in html:
        html = html.replace('app.mainloop()\n\n\nLangkah 5', 'app.mainloop()</code></pre>\n\nLangkah 5')
        html = html.replace('Membuat fungsi untuk menambahkan dan menghapus item list di scrollable area</code></pre><br>def', 
                           'Membuat fungsi untuk menambahkan dan menghapus item list di scrollable area<br><pre class=\"syntax-block\"><code>def')
        
        if isinstance(el, dict):
            data['elements'][i]['html'] = html
        else:
            data['elements'][i] = html
        changed = True
        print('Fixed Task Manager Langkah 5')

if changed:
    with open(draft_path, 'w') as f:
        json.dump(data, f)
        print('Saved draft.')
