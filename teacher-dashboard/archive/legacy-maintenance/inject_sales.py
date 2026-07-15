import re

source_file = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-centered/teacher-dashboard/panduan-scl.html'
dest_file = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-centered/teacher-dashboard/panduan-scl-cabang.html'

with open(source_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject CSS
css_to_inject = """
        /* Sales Box for Cabang */
        .sales-box {
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
        }
"""
content = content.replace("/* ── Decorative Assets ── */", css_to_inject + "\n        /* ── Decorative Assets ── */")

# 2. Update Title and Headers
content = content.replace("<title>Panduan SCL - Teacher Dashboard Kalananti</title>", "<title>Panduan SCL Cabang - Edukasi & Selling Kalananti</title>")
content = content.replace("PANDUAN GURU EKSKLUSIF", "PANDUAN CABANG & GURU")

# 3. Use targeted replacements
replacements = [
    (
        r'(<div class="alert-box mb-0 text-left">.*?</div>\s+</div>)',
        r'''\1
            <div class="sales-box mt-4">
                <div class="sales-box-title"><span>💬</span> Angle Selling ke Orang Tua</div>
                <p class="mb-3 font-medium">Gunakan fakta ini untuk memvalidasi kekhawatiran orang tua terhadap tempat les lain.</p>
                <div class="sales-script">"Bunda, di tempat les biasa, anak sering bosan karena harus menunggu temannya yang lambat, atau malah stres karena tertinggal. Di Kalananti, kami menggunakan SCL agar anak Bunda bisa belajar sesuai dengan kecepatannya sendiri tanpa dibatasi jadwal yang kaku!"</div>
            </div>'''
    ),
    (
        r'(Saatnya merevolusi pengalaman belajar!</p>\s+</div>)',
        r'''\1
            <div class="sales-box text-left mt-6">
                <div class="sales-box-title"><span>💡</span> Value untuk Tim Cabang (Front Desk)</div>
                <p class="mb-3 font-medium">Masalah operasional ini adalah keuntungan terbesar kita saat berjualan!</p>
                <div class="sales-script">"Bunda mau daftar hari Sabtu jam 10? Bisa langsung masuk minggu ini Bunda! Di Kalananti, Bunda tidak perlu menunggu kuota kelas penuh atau menunggu murid dengan level yang sama terkumpul. Anak Bunda bisa langsung mulai karena pembelajarannya personal."</div>
            </div>'''
    ),
    (
        r'(terlebih dahulu mencari solusi sebelum bertanya pada guru.</p>\s+</div>\s+</div>)',
        r'''\1
                <div class="sales-box md:col-span-2 mt-0">
                    <div class="sales-box-title"><span>💬</span> Angle Selling ke Orang Tua</div>
                    <div class="sales-script">"Metode SCL melatih kemandirian anak. Kita tidak menyuapi mereka jawaban. Saat mereka bingung, mereka dilatih untuk mencari tahu masalahnya sendiri. Ini melatih resiliensi (pantang menyerah) yang sangat dibutuhkan di masa depan, Bunda!"</div>
                </div>'''
    ),
    (
        r'(alt="Guru Kolaboratif" class="w-full h-auto rounded-xl shadow-sm border border-green-300 object-cover">\s+</div>\s+</div>)',
        r'''\1
            <div class="sales-box mt-4 text-left w-full">
                <div class="sales-box-title"><span>🛡️</span> Handling Objection (Bila Ortu Bertanya)</div>
                <p class="mb-3 font-medium">Jika orang tua melihat dari luar dan bertanya: "Kok gurunya jongkok-jongkok santai banget?"</p>
                <div class="sales-script">"Betul Bunda, guru kami memang dilatih untuk sejajar (eye-level) dengan anak. Tujuannya agar guru tidak terlihat seperti 'Bos' yang mengintimidasi dari atas, melainkan sebagai 'Mitra Belajar' yang kolaboratif. Ini membuat anak lebih berani bertanya."</div>
            </div>'''
    ),
    (
        r'(atau cukup \*berbisik\* ke anak di seberang meja.</li>\s+</ul>\s+</div>\s+</div>)',
        r'''\1
                <div class="sales-box md:col-span-2 mt-6">
                    <div class="sales-box-title"><span>🛡️</span> Handling Objection (Bila Ortu Bertanya)</div>
                    <p class="mb-3 font-medium">Jika orang tua bertanya: "Kok mejanya bulat-bulat berkelompok? Nggak ada papan tulis di depan?"</p>
                    <div class="sales-script">"Layout kita memang Open Space Bunda. Kalau semua menghadap ke depan, kelas terasa kaku seperti ujian dan anak jadi takut. Dengan saling berhadapan, anak jadi terbiasa berkolaborasi dan komunikasi sosialnya terbangun!"</div>
                </div>'''
    ),
    (
        r'(Masing-masing.</div>)',
        r'''masing-masing.</div>
                    <div class="sales-box mt-4">
                        <div class="sales-box-title"><span>💰</span> Kunci Penjualan Paling Ampuh!</div>
                        <p class="mb-3 font-medium">Ini adalah senjata utama tim sales untuk langsung menutup pendaftaran hari itu juga.</p>
                        <div class="sales-script">"Karena model SCL kita sangat personal, anak SD yang baru Level 1 bisa belajar di ruangan yang sama dengan anak SMP Level 3 tanpa saling mengganggu! Jadi jadwalnya sangat fleksibel untuk menyesuaikan kesibukan Bunda."</div>
                    </div>'''
    ),
    (
        r'(sehingga materi praktikum tidak akan tertinggal.</p>\s+</div>\s+</div>)',
        r'''\1
                <div class="sales-box lg:col-span-2 mt-6">
                    <div class="sales-box-title"><span>💬</span> Angle Selling ke Orang Tua</div>
                    <div class="sales-script">"Bunda, 10 menit pertama di Kalananti itu kita pakai untuk game sosialisasi. Tujuannya supaya anak yang pemalu bisa langsung membaur dan berani ngomong. Jadi belajar koding di sini bukan cuma soal laptop, tapi juga melatih jiwa sosial anak!"</div>
                </div>'''
    ),
    (
        r'(hype</i> kompitisi positif memuncak!</li>\s+</ul>\s+</div>)',
        r'''\1
            <div class="sales-box mt-6">
                <div class="sales-box-title"><span>💬</span> Angle Selling ke Orang Tua</div>
                <div class="sales-script">"Setiap akhir sesi, anak Bunda akan diminta presentasi kecil (Show & Tell) ke teman-temannya. Ini sangat melatih keberanian dan public speaking mereka sejak dini!"</div>
            </div>'''
    ),
    (
        r'(\.\.\.Baru akhirnya panggil MENTOR! \(ME\)\s+</div>\s+</div>)',
        r'''\1
                <div class="sales-box mt-6 text-left w-full">
                    <div class="sales-box-title"><span>🛡️</span> Edukasi Ortu (Kenapa anak terlihat kesusahan?)</div>
                    <div class="sales-script">"Bunda, kalau anak kelihatan kesulitan, guru kami memang tidak langsung memberitahu jawabannya. Kami punya aturan '3 Before Me'. Anak harus mencoba mikir dulu, baca instruksi, atau tanya temannya. Kalau kita langsung kasih tahu, anak tidak akan mandiri."</div>
                </div>'''
    ),
    (
        r'(fungsi dari blok loop warna orange tadi tuh untuk ngapain jadinya\?"</i></li>\s+</ul>\s+</div>)',
        r'''\1
            <div class="sales-box mt-6 text-left">
                <div class="sales-box-title"><span>💬</span> Angle Selling ke Orang Tua</div>
                <div class="sales-script">"Guru Kalananti tidak pernah bertanya 'Udah ngerti belum?'. Mereka akan meminta anak menjelaskan ulang logikanya pakai bahasanya sendiri. Dengan begitu, pemahaman anak benar-benar tajam dan bukan cuma sekadar menghafal."</div>
            </div>'''
    ),
    (
        r'(dan saling <i>peer tutoring</i>.\s+</div>\s+</div>)',
        r'''\1
                <div class="sales-box mt-6">
                    <div class="sales-box-title"><span>💡</span> Inti dari Selling SCL</div>
                    <div class="sales-script">"Hasil akhir dari belajar di Kalananti bukan cuma jadi aplikasi, Bunda. Tapi kepuasan dan senyum bangga anak Bunda saat bilang: 'Wah, akhirnya aku bisa bikin ini sendiri!' Kepuasan itulah yang menumbuhkan kecintaan belajar seumur hidup."</div>
                </div>'''
    )
]

for pat, rep in replacements:
    content, count = re.subn(pat, rep, content, count=1, flags=re.DOTALL)
    if count == 0:
        print(f"Failed to match pattern: {pat[:50]}...")

content = content.replace("SCL Certified Mentor", "SCL Branch & Mentor Certified")

# Change Own-Paced each child focus module text to replace the Masing-masing error.
content = content.replace("Masing-masing.</div>", "masing-masing.</div>")
content = content.replace("masing-masing.</div>", """masing-masing.</div>
                    <div class="sales-box mt-4">
                        <div class="sales-box-title"><span>💰</span> Kunci Penjualan Paling Ampuh!</div>
                        <p class="mb-3 font-medium">Ini adalah senjata utama tim sales untuk langsung menutup pendaftaran hari itu juga.</p>
                        <div class="sales-script">"Karena model SCL kita sangat personal, anak SD yang baru Level 1 bisa belajar di ruangan yang sama dengan anak SMP Level 3 tanpa saling mengganggu! Jadi jadwalnya sangat fleksibel untuk menyesuaikan kesibukan Bunda."</div>
                    </div>""")

with open(dest_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injection complete successfully!")
