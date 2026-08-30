import re

file_path = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-centered/teacher-dashboard/panduan-scl-cabang.html'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

bad_block = '''                </div>
            <div class="sales-box mt-4">
                <div class="sales-box-title"><span>💬</span> Angle Selling ke Orang Tua</div>
                <p class="mb-3 font-medium">Gunakan fakta ini untuk memvalidasi kekhawatiran orang tua terhadap tempat les lain.</p>
                <div class="sales-script">"Bunda, di tempat les biasa, anak sering bosan karena harus menunggu temannya yang lambat, atau malah stres karena tertinggal. Di Kalananti, kami menggunakan SCL agar anak Bunda bisa belajar sesuai dengan kecepatannya sendiri tanpa dibatasi jadwal yang kaku!"</div>
            </div>
                <!-- IMAGE PLACEHOLDER -->
                <div class="w-full md:w-1/3 flex justify-center mt-6 md:mt-0">
                    <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/27e73134-5b1e-4747-9605-fd3ebbdddbf6.png" alt="Masalah Klasik" class="w-full h-auto rounded-xl shadow border-2 border-dashed border-gray-300">
                </div>
            </div>'''

good_block = '''                </div>
                <!-- IMAGE PLACEHOLDER -->
                <div class="w-full md:w-1/3 flex justify-center mt-6 md:mt-0">
                    <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/27e73134-5b1e-4747-9605-fd3ebbdddbf6.png" alt="Masalah Klasik" class="w-full h-auto rounded-xl shadow border-2 border-dashed border-gray-300">
                </div>
            </div>
            
            <div class="sales-box mt-6 text-left w-full">
                <div class="sales-box-title"><span>💬</span> Angle Selling ke Orang Tua</div>
                <p class="mb-3 font-medium">Gunakan fakta ini untuk memvalidasi kekhawatiran orang tua terhadap tempat les lain.</p>
                <div class="sales-script">"Bunda, di tempat les biasa, anak sering bosan karena harus menunggu temannya yang lambat, atau malah stres karena tertinggal. Di Kalananti, kami menggunakan SCL agar anak Bunda bisa belajar sesuai dengan kecepatannya sendiri tanpa dibatasi jadwal yang kaku!"</div>
            </div>'''

if bad_block in html:
    html = html.replace(bad_block, good_block)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("Fixed slide 3")
else:
    print("Bad block not found")

