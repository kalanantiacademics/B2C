import re

file_path = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-centered/teacher-dashboard/panduan-scl-cabang.html'
with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Fix .slide CSS
html = html.replace('justify-content: center;', 'justify-content: flex-start; /* Fixed for overflow */')

# 2. Add margin-top: auto and margin-bottom: auto to the direct wrapper divs
# The wrapper div is usually <div class="max-w-5xl w-full"> or 4xl or 6xl
html = re.sub(r'(<div class="max-w-[1-9]xl w-full.*?)"', r'\1 my-auto"', html)

# 3. Reduce padding and margins
html = html.replace('p-10', 'p-6 md:p-8')
html = html.replace('p-12', 'p-8')
html = html.replace('mb-10', 'mb-6')
html = html.replace('mb-8', 'mb-5')
html = html.replace('mb-6', 'mb-4')
html = html.replace('mt-8', 'mt-5')
html = html.replace('mt-6', 'mt-4')

# 4. Modify sales-box CSS
old_sales_css = '''        .sales-box {
            background: rgba(51, 157, 157, 0.1);
            border-left: 5px solid #339D9D;
            border-radius: 0.5rem 1rem 1rem 0.5rem;
            padding: 1.5rem;
            margin-top: 1.5rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            width: 100%;
        }
        .sales-box-title {
            font-weight: 800;
            color: #1a6f6f;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1.2rem;
            margin-bottom: 0.5rem;
        }
        .sales-script {
            font-style: italic;
            background: rgba(255,255,255,0.6);
            padding: 1rem;
            border-radius: 0.5rem;
            color: #1a4576;
            font-weight: 600;
            border: 1px dashed #339D9D;
        }'''

new_sales_css = '''        .sales-box {
            background: rgba(51, 157, 157, 0.1);
            border-left: 4px solid #339D9D;
            border-radius: 0.5rem 1rem 1rem 0.5rem;
            padding: 1rem 1.2rem;
            margin-top: 1rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            width: 100%;
        }
        .sales-box-title {
            font-weight: 800;
            color: #1a6f6f;
            display: flex;
            align-items: center;
            gap: 0.4rem;
            font-size: 1.1rem;
            margin-bottom: 0.4rem;
        }
        .sales-script {
            font-style: italic;
            background: rgba(255,255,255,0.6);
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            color: #1a4576;
            font-weight: 600;
            border: 1px dashed #339D9D;
            font-size: 0.95rem;
        }'''

html = html.replace(old_sales_css, new_sales_css)

# Also scale down some text classes inside sales-box and alerts if needed
# We already made sales-script font-size: 0.95rem

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Layout fixes applied.")
