import re

file_path = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-centered/teacher-dashboard/panduan-scl-cabang.html'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update totalSlides
html = re.sub(r'const totalSlides = \d+;', 'const totalSlides = 47;', html)
html = re.sub(r'1 / \d+', '1 / 47', html)

# 2. Extract slides.
parts = re.split(r'(<!-- SLIDE 1: .*?-->)', html, maxsplit=1)
header = parts[0]
slides_content = parts[1] + parts[2]

slides_parts = re.split(r'(<script>)', slides_content, maxsplit=1)
slides_html = slides_parts[0]
footer = slides_parts[1] + slides_parts[2]

slides = re.split(r'(?=<!-- SLIDE \d+:)', slides_html)
slides = [s for s in slides if s.strip()]

new_slides = []
slide_counter = 1

for i, s in enumerate(slides):
    match = re.search(r'<!-- SLIDE (\d+):', s)
    if match:
        num = int(match.group(1))
        
        # Insert BEFORE original slide 4
        if slide_counter == 4:
            new_slide_4 = '''<!-- SLIDE 4: Learning Journey -->
    <div class="slide" id="slide-4">
        <div class="max-w-6xl w-full">
            <span class="badge mb-6 block text-center mx-auto w-max">ROADMAP KALANANTI</span>
            <h2 class="font-display font-black text-4xl mb-4 heading-text text-center">Learning Journey (6 Level)</h2>
            <p class="text-xl text-center text-gray-600 mb-8 font-medium">18-Months Intensive Program (1 Level per Quarter). Dari nol hingga mastery!</p>
            
            <!-- STAIRCASE LAYOUT -->
            <div class="flex items-end justify-center h-80 gap-2 mb-8 hidden md:flex">
                <!-- Level 1 -->
                <div class="w-1/6 bg-yellow-300 h-1/6 rounded-t-xl relative group transition-all hover:scale-105 shadow-md flex flex-col items-center justify-end pb-4 border-2 border-b-0 border-yellow-400 cursor-pointer">
                    <span class="font-black text-yellow-900 text-sm">FOUNDATIONAL</span>
                    <div class="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 bg-white p-3 rounded-lg shadow-xl border-2 border-yellow-400 w-48 text-xs z-10 transition-opacity pointer-events-none text-left">
                        <b class="text-yellow-700">Follow & Understand</b><br>Belajar mengikuti panduan dasar dan mengidentifikasi error sederhana.
                    </div>
                </div>
                <!-- Level 2 -->
                <div class="w-1/6 bg-orange-400 h-2/6 rounded-t-xl relative group transition-all hover:scale-105 shadow-md flex flex-col items-center justify-end pb-4 border-2 border-b-0 border-orange-500 cursor-pointer">
                    <span class="font-black text-white text-sm">BASIC</span>
                    <div class="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 bg-white p-3 rounded-lg shadow-xl border-2 border-orange-500 w-48 text-xs z-10 transition-opacity pointer-events-none text-left">
                        <b class="text-orange-600">Apply Basics Correctly</b><br>Menerapkan instruksi menjadi fungsional dengan aset simpel.
                    </div>
                </div>
                <!-- Level 3 -->
                <div class="w-1/6 bg-blue-300 h-3/6 rounded-t-xl relative group transition-all hover:scale-105 shadow-md flex flex-col items-center justify-end pb-4 border-2 border-b-0 border-blue-400 cursor-pointer">
                    <span class="font-black text-blue-900 text-sm">EMERGING</span>
                    <div class="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 bg-white p-3 rounded-lg shadow-xl border-2 border-blue-400 w-48 text-xs z-10 transition-opacity pointer-events-none text-left">
                        <b class="text-blue-700">Combine Concepts</b><br>Menggabungkan variabel & loop. Memperbaiki error mandiri.
                    </div>
                </div>
                <!-- Level 4 -->
                <div class="w-1/6 bg-blue-500 h-4/6 rounded-t-xl relative group transition-all hover:scale-105 shadow-md flex flex-col items-center justify-end pb-4 border-2 border-b-0 border-blue-600 cursor-pointer">
                    <span class="font-black text-white text-sm">INTERMEDIATE</span>
                    <div class="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 bg-white p-3 rounded-lg shadow-xl border-2 border-blue-600 w-48 text-xs z-10 transition-opacity pointer-events-none text-left">
                        <b class="text-blue-600">Design Systems</b><br>Mendesain project konsisten dengan logika terstruktur.
                    </div>
                </div>
                <!-- Level 5 -->
                <div class="w-1/6 bg-green-400 h-5/6 rounded-t-xl relative group transition-all hover:scale-105 shadow-md flex flex-col items-center justify-end pb-4 border-2 border-b-0 border-green-500 cursor-pointer">
                    <span class="font-black text-green-900 text-sm">ADVANCED</span>
                    <div class="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 bg-white p-3 rounded-lg shadow-xl border-2 border-green-500 w-48 text-xs z-10 transition-opacity pointer-events-none text-left">
                        <b class="text-green-700">Explain & Refine</b><br>Memprediksi bug dan menyempurnakan kode dengan efektif.
                    </div>
                </div>
                <!-- Level 6 -->
                <div class="w-1/6 bg-teal-600 h-full rounded-t-xl relative group transition-all hover:scale-105 shadow-md flex flex-col items-center justify-end pb-4 border-2 border-b-0 border-teal-700 cursor-pointer">
                    <div class="absolute -top-10 text-5xl">🏆</div>
                    <span class="font-black text-white text-sm">MASTERY</span>
                    <div class="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 bg-white p-3 rounded-lg shadow-xl border-2 border-teal-700 w-48 text-xs z-10 transition-opacity pointer-events-none text-left">
                        <b class="text-teal-700">Optimize & Compete</b><br>Bikin project original *scalable*. Siap presentasi & kompetisi!
                    </div>
                </div>
            </div>

            <!-- Mobile List Layout -->
            <div class="md:hidden flex flex-col gap-2 mb-8">
                <div class="bg-yellow-100 p-3 rounded-lg border-l-4 border-yellow-400"><b>1. Foundational:</b> Follow & Understand</div>
                <div class="bg-orange-100 p-3 rounded-lg border-l-4 border-orange-500"><b>2. Basic:</b> Apply Basics Correctly</div>
                <div class="bg-blue-100 p-3 rounded-lg border-l-4 border-blue-400"><b>3. Emerging:</b> Combine Concepts</div>
                <div class="bg-blue-200 p-3 rounded-lg border-l-4 border-blue-600"><b>4. Intermediate:</b> Design Systems</div>
                <div class="bg-green-100 p-3 rounded-lg border-l-4 border-green-500"><b>5. Advanced:</b> Explain & Refine</div>
                <div class="bg-teal-100 p-3 rounded-lg border-l-4 border-teal-600"><b>6. Mastery:</b> Optimize & Compete</div>
            </div>
            
            <div class="sales-box mt-4">
                <div class="sales-box-title"><span>💬</span> Angle Selling ke Orang Tua</div>
                <div class="sales-script">"Bunda, di Kalananti anak punya peta perjalanan (Learning Journey) yang sangat jelas, mulai dari pemula hingga siap lomba (Mastery). Hebatnya sistem SCL kita, anak bisa naik level ini tanpa harus pindah jadwal atau pindah kelas! Mereka tetap bisa di jadwal yang sama meskipun mereka sudah loncat ke level yang lebih tinggi dari temannya."</div>
            </div>
        </div>
    </div>
'''
            new_slides.append(new_slide_4)
            
        # Update the slide ID and comment
        s = re.sub(r'<!-- SLIDE \d+:', f'<!-- SLIDE {slide_counter + (1 if slide_counter >= 4 else 0)}:', s)
        s = re.sub(r'id="slide-\d+"', f'id="slide-{slide_counter + (1 if slide_counter >= 4 else 0)}"', s)
        new_slides.append(s)
        slide_counter += 1

new_slides_html = "".join(new_slides)

# Update TOC
toc_match = re.search(r'(<div class="meeting-dropdown".*?</div>)', header, re.DOTALL)
if toc_match:
    toc_html = toc_match.group(1)
    toc_lines = toc_html.split('\n')
    new_toc_lines = []
    
    current_toc_index = 1
    
    for line in toc_lines:
        if 'class="meeting-item"' in line:
            idx_match = re.search(r'goToSlide\((\d+)\)', line)
            if idx_match:
                orig_idx = int(idx_match.group(1))
                if orig_idx == 4:
                    new_line_new_slide = f'        <div class="meeting-item" onclick="goToSlide({current_toc_index})">{current_toc_index}. Learning Journey (6 Level)</div>'
                    new_toc_lines.append(new_line_new_slide)
                    current_toc_index += 1
                    
                new_line = re.sub(r'goToSlide\(\d+\)', f'goToSlide({current_toc_index})', line)
                new_line = re.sub(r'>\d+\.', f'>{current_toc_index}.', new_line)
                new_toc_lines.append(new_line)
                current_toc_index += 1
        else:
            new_toc_lines.append(line)
            
    header = header.replace(toc_html, '\n'.join(new_toc_lines))

final_html = header + new_slides_html + footer

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(final_html)

print("Update complete")
