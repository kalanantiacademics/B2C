import re

file_path = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-centered/teacher-dashboard/panduan-scl-cabang.html'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update totalSlides
html = re.sub(r'const totalSlides = 47;', 'const totalSlides = 46;', html)
html = re.sub(r'1 / 47', '1 / 46', html)

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
for s in slides:
    match = re.search(r'<!-- SLIDE (\d+):', s)
    if match:
        num = int(match.group(1))
        if num == 11:
            new_slide_11 = '''<!-- SLIDE 11: Perbandingan Kalananti -->
    <div class="slide" id="slide-11">
        <div class="max-w-6xl w-full">
            <span class="badge mb-6 block text-center mx-auto w-max">PERBANDINGAN METODE</span>
            <h2 class="font-display font-black text-4xl mb-8 heading-text text-center">Teacher-Centered vs Student-Centered</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                <!-- Reguler -->
                <div class="planet-card p-8 border-t-8 border-t-red-400 bg-red-50/50">
                    <h3 class="text-2xl font-bold mb-4 flex items-center gap-2 text-red-700"><span class="text-3xl">👨‍🏫</span> Kelas Reguler Biasa</h3>
                    <ul class="scl-list font-medium space-y-4 text-lg text-gray-800">
                        <li><b>Satu Untuk Semua:</b> Guru ceramah di papan tulis, semua anak disuapi materi yang sama di waktu yang sama.</li>
                        <li><b>Kecepatan Disamakan:</b> Anak yang pintar bosan menunggu temannya, anak yang lambat stres karena merasa tertinggal.</li>
                        <li><b>Anak Cenderung Pasif:</b> Murid hanya menyalin instruksi dan menunggu dikte dari guru.</li>
                    </ul>
                </div>
                
                <!-- SCL -->
                <div class="planet-card p-8 border-t-8 border-t-green-500 bg-green-50/50 shadow-xl transform scale-105">
                    <h3 class="text-2xl font-bold mb-4 flex items-center gap-2 text-green-800"><span class="text-3xl">🚀</span> SCL di Kalananti</h3>
                    <ul class="scl-list font-medium space-y-4 text-lg text-gray-800">
                        <li><b>Pendekatan Privat:</b> Guru bermanuver mendatangi meja dan memantau layar anak secara personal <i>(Tailored 1-on-1)</i>.</li>
                        <li><b>Own-Paced:</b> Anak melaju kencang atau pelan mencerna materi secara mandiri tanpa terbebani kecepatan teman.</li>
                        <li><b>Aktif & Tangguh:</b> Anak dilatih memecahkan <i>error</i> sendiri melalui Modul & Petunjuk Interaktif (INS).</li>
                    </ul>
                </div>
            </div>
            
            <div class="sales-box mt-8">
                <div class="sales-box-title"><span>💬</span> Script Edukasi Orang Tua</div>
                <div class="sales-script">"Bunda, kalau di kelas biasa anak disuapi instruksi massal, di Kalananti anak dilatih menjadi problem-solver mandiri. Mereka belajar sesuai kecepatannya sendiri (nggak stres kalau lambat, nggak bosan kalau cepat), dan guru kami hadir mendampingi secara privat saat mereka stuck, bukan sekadar penceramah."</div>
            </div>
        </div>
    </div>
'''
            new_slides.append(new_slide_11)
        elif num == 12:
            continue
        else:
            new_slides.append(s)
    else:
        new_slides.append(s)

final_slides = []
current_num = 1
for s in new_slides:
    if "<!-- SLIDE" in s:
        s = re.sub(r'<!-- SLIDE \d+:', f'<!-- SLIDE {current_num}:', s)
        s = re.sub(r'id="slide-\d+"', f'id="slide-{current_num}"', s)
        current_num += 1
    final_slides.append(s)

new_slides_html = "".join(final_slides)

# Update TOC
toc_match = re.search(r'(<div class="meeting-dropdown".*?</div>)', header, re.DOTALL)
if toc_match:
    toc_html = toc_match.group(1)
    toc_lines = toc_html.split('\n')
    new_toc_lines = []
    
    slide_counter = 1
    
    for line in toc_lines:
        if 'class="meeting-item"' in line:
            idx_match = re.search(r'goToSlide\((\d+)\)', line)
            if idx_match:
                orig_idx = int(idx_match.group(1))
                if orig_idx == 11:
                    new_line = f'        <div class="meeting-item" onclick="goToSlide({slide_counter})">{slide_counter}. Teacher vs Student Centered</div>'
                    new_toc_lines.append(new_line)
                    slide_counter += 1
                elif orig_idx == 12:
                    continue
                else:
                    new_line = re.sub(r'goToSlide\(\d+\)', f'goToSlide({slide_counter})', line)
                    new_line = re.sub(r'>\d+\.', f'>{slide_counter}.', new_line)
                    new_toc_lines.append(new_line)
                    slide_counter += 1
        else:
            new_toc_lines.append(line)
            
    header = header.replace(toc_html, '\n'.join(new_toc_lines))

final_html = header + new_slides_html + footer

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(final_html)

print("Update complete")
