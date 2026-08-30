import re

file_path = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-centered/teacher-dashboard/panduan-scl-cabang.html'
with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

bad_block = '''                    <div class="alert-box mb-0 text-left">
                        <b>Solusi SCL:</b> Gabungkan mereka! Dalam kelas SCL, anak Level 1, 2, dan 3 bisa duduk dalam 1 jadwal di ruang yang sama, karena setiap anak fokus dengan Modul Cetaknya yang <i>Own-Paced</i> masing-masing.
                    </div>
                </div>
                    <div class="sales-box mt-4">
                        <div class="sales-box-title"><span>💰</span> Kunci Penjualan Paling Ampuh!</div>
                        <p class="mb-3 font-medium">Ini adalah senjata utama tim sales untuk langsung menutup pendaftaran hari itu juga.</p>
                        <div class="sales-script">"Karena model SCL kita sangat personal, anak SD yang baru Level 1 bisa belajar di ruangan yang sama dengan anak SMP Level 3 tanpa saling mengganggu! Jadi jadwalnya sangat fleksibel untuk menyesuaikan kesibukan Bunda."</div>
                    </div>
                <!-- IMAGE PLACEHOLDER -->
                <div class="w-full md:w-1/3 flex justify-center mt-6 md:mt-0">
                    <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/e70fa997-c2b1-4670-bf1e-b0a3fb49c50b.png" alt="Multi Level Diagram" class="w-full h-auto rounded-xl shadow-md border-2 border-dashed border-gray-300">
                </div>
            </div>'''

good_block = '''                    <div class="alert-box mb-0 text-left">
                        <b>Solusi SCL:</b> Gabungkan mereka! Dalam kelas SCL, anak Level 1, 2, dan 3 bisa duduk dalam 1 jadwal di ruang yang sama, karena setiap anak fokus dengan Modul Cetaknya yang <i>Own-Paced</i> masing-masing.
                    </div>
                </div>
                <!-- IMAGE PLACEHOLDER -->
                <div class="w-full md:w-1/3 flex justify-center mt-6 md:mt-0">
                    <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/e70fa997-c2b1-4670-bf1e-b0a3fb49c50b.png" alt="Multi Level Diagram" class="w-full h-auto rounded-xl shadow-md border-2 border-dashed border-gray-300">
                </div>
            </div>
            
            <div class="sales-box mt-6 w-full text-left">
                <div class="sales-box-title"><span>💰</span> Kunci Penjualan Paling Ampuh!</div>
                <p class="mb-3 font-medium">Ini adalah senjata utama tim sales untuk langsung menutup pendaftaran hari itu juga.</p>
                <div class="sales-script">"Karena model SCL kita sangat personal, anak SD yang baru Level 1 bisa belajar di ruangan yang sama dengan anak SMP Level 3 tanpa saling mengganggu! Jadi jadwalnya sangat fleksibel untuk menyesuaikan kesibukan Bunda."</div>
            </div>'''

if bad_block in html:
    html = html.replace(bad_block, good_block)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("Fixed Slide 19")
else:
    print("Block not found!")
