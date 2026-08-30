import re

with open('panduan-scl.html', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "    <!-- SLIDE DASHBOARD 1 -->"
end_marker = "    <!-- SLIDE 46: Kesimpulan 1 -->"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found!")
    exit(1)

new_slides = """    <!-- SLIDE DASHBOARD 1 -->
    <div class="slide" id="slide-dash-1">
        <div class="max-w-5xl w-full text-center">
            <span class="badge mb-6 bg-purple-100 text-purple-700 border-purple-200">BAGIAN 5</span>
            <h2 class="font-display font-black text-4xl mb-8 heading-text text-center">Panduan Lengkap Penggunaan Teacher Dashboard SCL</h2>
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <p class="text-xl text-gray-700 mb-8">Dokumen ini merupakan panduan resmi bagi pengajar untuk menggunakan sistem Teacher Dashboard pada kelas SCL (Student-Centered Learning). Harap baca dan ikuti setiap langkah dengan saksama.</p>
                <h3 class="text-3xl font-bold mb-6 text-gray-800">1. Akses Menuju Dashboard</h3>
                <p class="text-xl text-gray-700 mb-6">Langkah pertama untuk memulai kelas adalah mengakses sistem dashboard pengajar. Silakan buka browser di perangkat Anda dan kunjungi tautan berikut: <b>kalananti.id/scl-teacher</b>.</p>
            </div>
        </div>
    </div>

    <!-- SLIDE DASHBOARD 2 -->
    <div class="slide" id="slide-dash-2">
        <div class="max-w-5xl w-full">
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <h3 class="text-3xl font-bold mb-6 text-gray-800">2. Proses Login</h3>
                <p class="text-xl text-gray-700 mb-6">Pada halaman awal, Anda akan diminta untuk masuk ke dalam sistem. Silakan masukkan alamat email pengajar Anda. Pastikan email yang digunakan adalah email yang sudah terdaftar secara resmi di sistem Akademia Kalananti.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/3a56dd13-ffb3-4d11-9174-14d4c8cd8c73.png" class="w-full max-w-2xl mx-auto rounded-xl shadow-md border" alt="Login">
            </div>
        </div>
    </div>

    <!-- SLIDE DASHBOARD 3 -->
    <div class="slide" id="slide-dash-3">
        <div class="max-w-5xl w-full">
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <h3 class="text-3xl font-bold mb-6 text-gray-800">3. Memahami Tampilan Utama Dashboard</h3>
                <p class="text-xl text-gray-700 mb-6">Setelah Anda berhasil melakukan login, Anda akan diarahkan ke halaman utama. Pada halaman ini, Anda akan melihat daftar seluruh kelas SCL yang saat ini menjadi tanggung jawab Anda, sesuai dengan data yang terhubung ke email Anda.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/bec9b9b5-824a-4888-ad9a-6703bcb36fcd.png" class="w-full max-w-3xl mx-auto rounded-xl shadow-md border mb-6" alt="Dashboard">
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-6 text-lg text-yellow-800 rounded"><b>Catatan Penting:</b> Apabila Anda merasa ada kelas yang seharusnya Anda ajar namun tidak terdaftar atau tidak muncul pada halaman ini, silakan segera hubungi SA (Student Advisor). Mintalah bantuan mereka untuk mengonfirmasi penamaan kode kelas Anda. Sebagai informasi, penamaan kode kelas SCL harus selalu diawali dengan format standar, yaitu (SCLXXXX).</div>
            </div>
        </div>
    </div>

    <!-- SLIDE DASHBOARD 4 -->
    <div class="slide" id="slide-dash-4">
        <div class="max-w-5xl w-full">
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <h3 class="text-3xl font-bold mb-6 text-gray-800">4. Mengakses Detail Kelas dan Progres Siswa</h3>
                <p class="text-xl text-gray-700 mb-4">Untuk memulai aktivitas mengajar, silakan klik atau pilih salah satu kelas dari daftar yang sedang Anda ajar. Anda kemudian akan diarahkan ke halaman baru yang secara khusus menampilkan daftar nama seluruh siswa yang tergabung di dalam kelas tersebut.</p>
                <p class="text-xl text-gray-700 mb-6">Keunggulan dari halaman ini adalah Anda dapat memantau progres belajar masing-masing siswa secara real-time atau langsung pada saat itu juga.</p>
                <div class="flex gap-6 items-center mb-8">
                    <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/813ab8bf-31de-4d46-9d7a-60d99911c248.png" class="w-1/2 rounded-xl shadow-md border" alt="Detail Kelas 1">
                    <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/39f6aa5a-5ef2-4244-8dcd-3769f987e856.png" class="w-1/2 rounded-xl shadow-md border" alt="Detail Kelas 2">
                </div>
                <div class="bg-gray-50 border p-6 rounded text-lg text-gray-700">
                    <p class="font-bold mb-4 text-xl">Keterangan Detail Indikator Progres Siswa:</p>
                    <p class="mb-4">Untuk memudahkan pemantauan, sistem menggunakan persentase untuk menunjukkan sejauh mana siswa telah menyelesaikan tugasnya. Berikut adalah panduannya:</p>
                    <ul class="list-disc ml-6 space-y-2">
                        <li><b>50%:</b> Ini menandakan bahwa siswa telah selesai membaca dan memahami semua materi yang diberikan, dan mereka saat ini berstatus siap untuk mulai mengerjakan tugas harian wajib (must-do).</li>
                        <li><b>95%:</b> Status ini menunjukkan bahwa siswa telah selesai mengerjakan tugas must-do (namun tugas tersebut belum diperiksa atau dinilai oleh pengajar) dan siswa tersebut TELAH menyelesaikan kuis.</li>
                        <li><b>100%:</b> Ini adalah status maksimal yang berarti seluruh tugas telah selesai dan telah dinilai oleh pengajar (mencakup tugas must-do dan seluruh challenge harian).</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <!-- SLIDE DASHBOARD 5 -->
    <div class="slide" id="slide-dash-5">
        <div class="max-w-5xl w-full">
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <h3 class="text-3xl font-bold mb-6 text-gray-800">5. Melakukan Penilaian Tugas Siswa</h3>
                <p class="text-xl text-gray-700 mb-6">Selama sesi berlangsung, jika terdapat siswa yang sudah mengumpulkan tugasnya, sistem akan memunculkan sebuah tombol khusus bagi Anda untuk melihat proyek tersebut. Anda sebagai pengajar memiliki tanggung jawab untuk memberikan nilai yang objektif berdasarkan hasil kerja nyata siswa.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/70781395-53ef-48fa-ae48-063a8836b414.png" class="w-full max-w-2xl mx-auto rounded-xl shadow-md border mb-8" alt="Penilaian">
                <p class="text-lg text-gray-700 mb-6">Setiap siswa diwajibkan untuk mengerjakan tugas harian per sesi yang disebut dengan tugas Must-do. Tugas ini berfungsi sebagai indikator utama bahwa mereka memahami materi yang diajarkan. Tugas yang dikumpulkan oleh siswa dapat berupa file proyek mentah (seperti dari platform Roblox, Python, atau Scratch) atau berupa tautan/link proyek yang telah dipublikasi secara online. Semua pengumpulan ini akan terintegrasi dan tersimpan di dalam Google Drive Kalananti.</p>
                <div class="flex gap-6 items-start">
                    <div class="w-1/2">
                        <p class="text-md text-gray-600 mb-3">Jika siswa mengumpulkan tugasnya dalam bentuk tautan (link), sistem dashboard akan secara otomatis menampilkan preview (pratinjau) dari proyek tersebut seperti pada gambar berikut:</p>
                        <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/3c67316b-d92a-4fae-9bae-be8ffe9e074e.png" class="rounded-xl shadow-md border w-full">
                    </div>
                    <div class="w-1/2">
                        <p class="text-md text-gray-600 mb-3">Namun, jika siswa mengumpulkan tugas dalam bentuk gambar tangkapan layar (screenshot) atau mengunggah file dokumen, sistem akan langsung menampilkan folder Google Drive. Folder ini sudah diatur agar dapat diakses oleh pengajar untuk diunduh dan dijadikan dasar penilaian:</p>
                        <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/5b464149-af91-4118-9a23-c19b62cbac36.png" class="rounded-xl shadow-md border w-full">
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- SLIDE DASHBOARD 6 -->
    <div class="slide" id="slide-dash-6">
        <div class="max-w-5xl w-full">
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <h3 class="text-3xl font-bold mb-6 text-gray-800">6. Pemberian Bintang (Sistem Reward)</h3>
                <p class="text-xl text-gray-700 mb-6">Setelah memeriksa tugas, pengajar berhak dan diwajibkan untuk menilai proyek tersebut secara objektif. Anda harus menentukan jumlah bintang yang layak didapatkan oleh setiap siswa. Pemberian bintang ini murni didasarkan pada tingkat pemahaman mereka terhadap materi dan kualitas hasil kerja yang dikumpulkan.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/caf9095b-76dd-4481-b118-f037ec178b50.png" class="w-full max-w-2xl mx-auto rounded-xl shadow-md border mb-8" alt="Bintang">
                <p class="text-xl text-gray-700 mb-6">Sebagai motivasi bagi siswa, setiap bintang yang Anda berikan akan dicatat dan disimpan oleh sistem. Bintang-bintang ini nantinya akan diakumulasi dan dapat ditukarkan (redeem) dengan berbagai hadiah menarik dari Kalananti melalui perantara SA Kids di Cabang masing-masing.</p>
                <div class="bg-blue-50 border-l-4 border-blue-400 p-6 text-lg text-blue-800 flex gap-6 items-center rounded">
                    <div class="flex-1">Pengecualian berlaku khusus untuk pengerjaan Kuis. Bintang untuk kuis akan diberikan dan dihitung secara otomatis oleh sistem berdasarkan jawaban benar. Skor ini transparan dan dapat dilihat langsung oleh pengajar maupun siswa bersangkutan.</div>
                    <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/bd152a1a-3bd1-4d47-80de-1ed33998eac2.png" class="h-20 object-contain rounded border border-gray-300 bg-white">
                </div>
            </div>
        </div>
    </div>

    <!-- SLIDE DASHBOARD 7 -->
    <div class="slide" id="slide-dash-7">
        <div class="max-w-5xl w-full">
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <h3 class="text-3xl font-bold mb-6 text-gray-800">7. Fitur Pemberian Bonus Bintang</h3>
                <p class="text-xl text-gray-700 mb-6">Selain bintang dari tugas, pengajar diberikan otoritas untuk memberikan apresiasi ekstra berupa bintang tambahan. Bonus ini diperuntukkan bagi siswa yang secara konsisten menunjukkan sikap positif selama di kelas (misalnya: sangat aktif bertanya, kooperatif dalam kelompok, inisiatif suka membantu teman yang kesulitan, dan lain-lain). Caranya sangat mudah, Anda cukup mengklik tombol "Beri Bonus Bintang" pada profil siswa tersebut.</p>
                <div class="flex gap-6 items-center">
                    <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/c4093fbd-6d65-447d-91ff-f34502357bc4.png" class="w-1/2 rounded-xl shadow-md border">
                    <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/a15f9f66-a81e-467a-b953-58e8d2d877b0.png" class="w-1/2 rounded-xl shadow-md border">
                </div>
            </div>
        </div>
    </div>

    <!-- SLIDE DASHBOARD 8 -->
    <div class="slide" id="slide-dash-8">
        <div class="max-w-5xl w-full">
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <h3 class="text-3xl font-bold mb-6 text-gray-800">8. Melihat dan Mengedit Riwayat Nilai Sebelumnya</h3>
                <p class="text-xl text-gray-700 mb-6">Sistem memberikan fleksibilitas bagi Anda jika terjadi kesalahan input atau jika Anda perlu meninjau kembali nilai di sesi lalu. Untuk melihat riwayat nilai atau mengubah nilai yang sudah pernah Anda simpan, silakan klik pada ikon mata. Tindakan ini akan membuka halaman detail dari sesi tersebut sehingga Anda bisa melakukan penyesuaian.</p>
                <div class="flex gap-6 items-center">
                    <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/1d0f5852-0e96-4cb5-b2b5-29efddb00252.png" class="w-1/2 rounded-xl shadow-md border">
                    <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/e602e8cb-519c-499a-8501-629e097ce257.png" class="w-1/2 rounded-xl shadow-md border">
                </div>
            </div>
        </div>
    </div>

    <!-- SLIDE DASHBOARD 9 -->
    <div class="slide" id="slide-dash-9">
        <div class="max-w-5xl w-full">
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <h3 class="text-3xl font-bold mb-6 text-gray-800">9. Pencatatan Absensi Siswa</h3>
                <p class="text-xl text-gray-700 mb-6">Sebagai pengingat, dalam program Kalananti, setiap satu level pembelajaran terdiri dari 12 sesi. Ini merepresentasikan total 12 jam pertemuan dengan durasi masing-masing pertemuan adalah 1 jam per sesi.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/b440cfcf-3518-40cc-8630-fb380591ddec.png" class="w-full max-w-2xl mx-auto rounded-xl shadow-md border mb-8">
                <p class="text-xl text-gray-700 mb-4"><b>Aturan Jatah Absen:</b> Setiap siswa memiliki batasan ketat untuk maksimal ketidakhadiran, yaitu sebanyak 3 kali per level. Sistem secara pintar akan merekam dan melacak riwayat kehadiran maupun ketidakhadiran siswa selama seluruh rentang sesi kelas.</p>
                <p class="text-xl text-gray-700 mb-4"><b>Sistem Otomatisasi Absen untuk Sesi Ganda:</b> Terdapat kondisi di mana seorang siswa mengambil jadwal padat dan mengikuti 2 sesi berturut-turut dalam satu hari pertemuan. Jika ini terjadi, sistem akan secara otomatis mencatat 2 sesi absensi sekaligus untuk hari tersebut. Apabila Anda menemukan kejanggalan atau data absensi yang tidak sesuai (misalnya, siswa hadir 1 sesi tapi tercatat 2, atau sebaliknya), mohon segera berkoordinasi dengan SA agar diperbaiki pada dokumen absensi resmi.</p>
                <p class="text-xl text-gray-700 mb-6"><b>Cara Praktis Mengisi Kehadiran:</b> Untuk memasukkan data absensi harian, Anda hanya perlu mengklik tombol geser atau toggle ON/OFF yang terletak di sebelah nama siswa. Posisikan ke 'OFF' (atau sesuai indikator sistem) pada siswa yang tidak hadir di hari itu. Setelah memastikan data benar, jangan lupa untuk menyimpan pengaturan sesi tersebut.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/faa468b9-1114-49be-9320-e9e7b1a80c1d.png" class="w-full max-w-2xl mx-auto rounded-xl shadow-md border">
            </div>
        </div>
    </div>

    <!-- SLIDE DASHBOARD 10 -->
    <div class="slide" id="slide-dash-10">
        <div class="max-w-5xl w-full">
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <h3 class="text-3xl font-bold mb-6 text-gray-800">10. Menavigasi Tab Progres Siswa</h3>
                <p class="text-xl text-gray-700 mb-8">Tab Progres adalah pusat komando Anda untuk memantau perkembangan kelas. Pada tab ini, pengajar dapat melihat dengan detail sesi mana yang sedang berjalan saat ini, status level siswa terkini, hingga grafik progres mereka secara keseluruhan. Halaman ini juga berfungsi ganda, di mana pengajar dapat masuk lebih dalam untuk meninjau detail pencapaian tiap individu dan memberikan nilai akhir terhadap tugas-tugas yang telah dikumpulkan ke sistem.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/5815cd63-0e9d-4b22-bfe9-83f0cdffc008.png" class="w-full max-w-4xl mx-auto rounded-xl shadow-md border">
            </div>
        </div>
    </div>

    <!-- SLIDE DASHBOARD 11 -->
    <div class="slide" id="slide-dash-11">
        <div class="max-w-5xl w-full">
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <h3 class="text-3xl font-bold mb-6 text-gray-800">11. Penilaian Observasi (Khusus Pertemuan ke-4 dan ke-8)</h3>
                <p class="text-xl text-gray-700 mb-6">Format kelas SCL tetap mengadopsi standar kualitas kelas reguler, yang berarti Anda diwajibkan melakukan penilaian observasi perilaku dan perkembangan siswa. Penilaian ini dikhususkan secara spesifik pada jadwal pertemuan ke-4 dan pertemuan ke-8. Saat kelas mencapai sesi tersebut, sistem akan secara otomatis memunculkan sebuah section (bagian) khusus untuk pengisian data observasi.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/05cd8bbc-d3eb-43b4-8c46-9197275d5d02.png" class="w-full max-w-3xl mx-auto rounded-xl shadow-md border mb-6">
                <p class="text-xl text-gray-700 mb-6">Sebagai pengajar, Anda diminta secara profesional untuk mengisi nilai observasi ini dengan berpatokan pada rubrik standar yang sudah disediakan oleh sistem. Anda juga memiliki ruang untuk memberikan komentar dan catatan tambahan deskriptif jika dirasa perlu untuk melaporkan kondisi spesifik siswa. Mohon untuk selalu mengikuti urutan instruksi yang muncul di layar.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/964471f2-1c57-4b1f-b090-7609a8d025c3.png" class="w-full max-w-3xl mx-auto rounded-xl shadow-md border">
            </div>
        </div>
    </div>

    <!-- SLIDE DASHBOARD 12 -->
    <div class="slide" id="slide-dash-12">
        <div class="max-w-5xl w-full">
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <h3 class="text-3xl font-bold mb-6 text-gray-800">12. Menggunakan Fitur Leaderboard (Papan Peringkat)</h3>
                <p class="text-xl text-gray-700 mb-8">Fitur Leaderboard dirancang sebagai alat motivasi. Halaman ini sangat disarankan untuk ditampilkan langsung kepada para siswa (misalnya saat screen sharing) guna membangun suasana kompetisi kelas yang positif dan sehat. Papan peringkat ini secara transparan memamerkan persentase progres belajar tiap siswa dan menyusun peringkat berdasarkan perolehan jumlah bintang terbanyak. Dengan melihat ini, diharapkan semangat juang siswa untuk menyelesaikan course akan terus meningkat.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/7405b8a2-9031-425c-b841-7f56e232e403.png" class="w-full max-w-3xl mx-auto rounded-xl shadow-md border">
            </div>
        </div>
    </div>

    <!-- SLIDE DASHBOARD 13 -->
    <div class="slide" id="slide-dash-13">
        <div class="max-w-5xl w-full">
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <h3 class="text-3xl font-bold mb-6 text-gray-800">13. Aturan Pengumpulan Final Project Siswa</h3>
                <p class="text-xl text-gray-700 mb-6">Sama halnya dengan standar kelulusan di kelas reguler, setiap siswa di kelas SCL diwajibkan untuk mendesain, membuat, dan mengumpulkan sebuah Final Project pada akhir level.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/934b3023-1157-4ec3-8853-ad248cc15179.png" class="w-full max-w-2xl mx-auto rounded-xl shadow-md border mb-6">
                <p class="text-xl text-gray-700 mb-6">Fitur pengumpulan Final Project ini didesain untuk baru akan muncul dan aktif ketika siswa mencapai pertemuan ke-12. Menariknya, proyek unggulan yang berhasil dikumpulkan pada tahap akhir ini akan otomatis dimasukkan ke dalam daftar nominasi PoTM (Project of The Month), sebuah penghargaan prestisius di mana karya siswa dapat berpeluang dipamerkan secara publik di website resmi Kalananti.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/11f08bfc-3cef-41ef-9555-7f0924cc9211.png" class="w-full max-w-2xl mx-auto rounded-xl shadow-md border mb-6">
                <p class="text-xl text-gray-700 mb-6"><b>Kondisi pada Sisi Siswa (Student Dashboard):</b> Sistem memiliki aturan otomatisasi. Akses menuju Sesi ke-12 di Student Dashboard akan secara otomatis terbuka (gemboknya hilang) apabila siswa secara absensi telah mencapai batas akhir pertemuan ke-12. Hal ini berlaku mutlak, meskipun secara progres penguasaan materi mereka tertinggal dan baru sampai pada modul yang lebih rendah (sebagai contoh, baru selesai di Modul 8).</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/7968553a-f895-4df1-b158-44ab888440ed.png" class="w-full max-w-2xl mx-auto rounded-xl shadow-md border mb-6">
                <p class="text-xl text-gray-700 mb-4"><b>Tugas pada Sisi Pengajar:</b> Menjelang atau pada saat pertemuan 12 berlangsung, Anda sebagai pengajar memiliki tugas validasi. Anda perlu melakukan konfirmasi atas Final Project yang dibuat siswa. Berikan centang atau tanda konfirmasi secara sistem pada proyek-proyek yang menurut Anda layak dan memenuhi syarat untuk dinominasikan ke PoTM.</p>
            </div>
        </div>
    </div>

    <!-- SLIDE DASHBOARD 14 -->
    <div class="slide" id="slide-dash-14">
        <div class="max-w-5xl w-full">
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <h3 class="text-3xl font-bold mb-6 text-gray-800">14. Pengumpulan Playlist Rekaman Mengajar (Khusus Kelas SCL)</h3>
                <p class="text-xl text-gray-700 mb-6">Ada administrasi khusus yang diberlakukan untuk pengajar kelas SCL. Anda diwajibkan untuk mengumpulkan tautan (link) kompilasi rekaman sesi mengajar Anda dalam bentuk sebuah playlist. Pengumpulan ini dilakukan melalui tombol khusus di dashboard:</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/e51cc33b-9ffd-4248-9f3c-4937aae52fc4.png" class="w-full max-w-md mx-auto rounded-xl shadow-md border mb-6">
                <p class="text-xl text-gray-700 mb-4"><b>Tata Cara Pengumpulan Rekaman:</b></p>
                <p class="text-xl text-gray-700 mb-6">Pertama, unggah seluruh video rekaman kelas Anda ke platform YouTube. Jadikan video-video tersebut ke dalam satu buah Playlist. Pastikan pengaturan privasi (visibilitas) Playlist tersebut Anda atur menjadi Unlisted (tidak publik, namun bisa diakses menggunakan link). Setelah itu, salin tautan Playlist YouTube tersebut dan kumpulkan ke dalam sistem dashboard dengan mengikuti panduan langkah demi langkah pada pop-up yang muncul di layar Anda.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/6021413b-3d81-409c-bd9b-8621e8988ae9.png" class="w-full max-w-2xl mx-auto rounded-xl shadow-md border">
            </div>
        </div>
    </div>

    <!-- SLIDE DASHBOARD 15 -->
    <div class="slide" id="slide-dash-15">
        <div class="max-w-5xl w-full text-center">
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <h3 class="text-3xl font-bold mb-6 text-gray-800 text-center">15. Referensi Tambahan: Panduan Pengajar - SCL</h3>
                <p class="text-xl text-gray-700 mb-8 text-center">Apabila Anda membutuhkan pemahaman teoretis maupun teknis yang lebih komprehensif terkait metode pengajaran SCL, Anda selalu dapat merujuk pada dokumen panduan penuh. Silakan klik tombol bertuliskan "Buka Panduan" di dashboard Anda untuk mempelajari seluruh instruksi, kebijakan, dan penjelasan mendalam yang tersedia.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/5edfd851-2d80-46b4-afa1-4467cec110ec.png" class="w-full max-w-sm mx-auto rounded-xl shadow-md border">
            </div>
        </div>
    </div>

    <!-- SLIDE DASHBOARD 16 -->
    <div class="slide" id="slide-dash-16">
        <div class="max-w-5xl w-full">
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <h3 class="text-3xl font-bold mb-6 text-gray-800">16. Akses dan Melihat Kurikulum SCL</h3>
                <p class="text-xl text-gray-700 mb-6">Demi menjaga integritas sistem, pengajar memang tidak diberikan akses untuk membuka backend atau struktur dasar perancangan modul. Namun, Anda tidak perlu khawatir karena Anda tetap diberikan akses penuh untuk mempelajari materi pengajaran melalui fitur Interactive Slide (INS). INS adalah presentasi kaya fitur yang memuat seluruh materi modul yang telah disesuaikan dan dikembangkan secara interaktif. Anda dapat membuka bahan ajar ini kapan saja dengan mengklik tombol "Lihat Kurikulum SCL".</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/bb8291f9-1612-485b-a2fd-28bd1fe5fb28.png" class="w-full max-w-3xl mx-auto rounded-xl shadow-md border mb-6">
                <p class="text-xl text-gray-700 mb-6">Melalui fitur ini, Anda memiliki kebebasan penuh untuk memfilter dan memilih modul, tingkatan level, maupun detail sesi spesifik yang ingin Anda pelajari atau tampilkan.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/581790fa-7715-4139-9b33-dabae88fe41e.png" class="w-full max-w-3xl mx-auto rounded-xl shadow-md border mb-6">
                <p class="text-xl text-gray-700 mb-6">Ini adalah perpustakaan digital Anda. Semua teks materi, gambar, dan berbagai aktivitas interaktif yang akan dikerjakan oleh siswa bisa Anda pratinjau seluruhnya di halaman ini.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/0ec3d853-4706-4997-9c31-9155c466e1c1.png" class="w-full max-w-3xl mx-auto rounded-xl shadow-md border mb-6">
                <p class="text-xl text-gray-700 mb-6">Sebagai alat bantu persiapan kelas, pengajar juga bisa mengecek dengan pasti daftar tugas spesifik apa saja yang wajib diselesaikan oleh siswa (kategori Must-do, Should-do, dan tugas pengayaan Aspire-to) sebagai syarat agar mereka bisa mendulang bintang.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/2cced65f-5044-4283-98ba-8d07731884d9.png" class="w-full max-w-3xl mx-auto rounded-xl shadow-md border mb-6">
                <div class="bg-gray-50 border p-6 rounded text-lg text-gray-700">
                    <p class="mb-4"><b>Mekanisme Akses Kunci Jawaban Kuis:</b> Khusus untuk persiapan evaluasi, pengajar diberikan fitur bantuan berupa akses penuh untuk melihat kunci jawaban kuis. Perlu diingat bahwa ini hanya untuk pegangan pengajar! Jika ada siswa yang bertanya karena kesulitan menjawab, posisikan diri Anda sebagai fasilitator. Arahkan logika mereka perlahan menuju pemahaman yang benar, dan hindari memperlihatkan layar kunci jawaban secara langsung. Tujuannya adalah agar siswa tetap tertantang belajar secara mandiri. (Untuk memunculkan jawaban di layar Anda, cukup klik tombol "Tampilkan Jawaban")</p>
                    <div class="flex gap-6 items-center">
                        <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/4569b12e-85a6-4c28-9684-b08ddc533fff.png" class="h-20 rounded border">
                        <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/ca32fad4-08f8-44a0-a474-b1675065127c.png" class="h-20 rounded border">
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- SLIDE DASHBOARD 17 -->
    <div class="slide" id="slide-dash-17">
        <div class="max-w-5xl w-full">
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <h3 class="text-3xl font-bold mb-6 text-gray-800">17. Kewajiban Melakukan Shared Activity</h3>
                <p class="text-xl text-gray-700 mb-6">Mengacu pada instruksi standar yang ditetapkan oleh Tim Akademik, sangat diwajibkan bagi seluruh pengajar untuk memimpin aktivitas pemanasan berskala kelompok (shared activity) tepat pada awal mula setiap pertemuan. Tujuan utama kegiatan ini adalah untuk mencairkan suasana (ice breaking), menumbuhkan rasa percaya diri pada setiap individu, serta memperkuat ikatan (bonding) antar siswa di dalam kelas tersebut. Jika Anda kehabisan ide, berbagai contoh dan rekomendasi kegiatan seru sudah disediakan khusus dan dapat Anda akses langsung pada tab bertuliskan Shared Activity.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/ca32fad4-08f8-44a0-a474-b1675065127c.png" class="w-full max-w-2xl mx-auto rounded-xl shadow-md border mb-6">
                <p class="text-xl text-gray-700 mb-6">Kami juga sangat terbuka dengan inovasi. Pengajar didorong untuk memberikan feedback atau saran jika memiliki ide kegiatan lain yang menurut Anda lebih cocok dan efektif untuk diterapkan di dinamika kelas masing-masing. Di sisi lain, apabila Anda menemui kendala di mana sebuah rekomendasi kegiatan terasa terlalu sulit diaplikasikan, jangan ragu untuk langsung menyampaikannya kepada Tim Akademik.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/8fb0052e-a695-4965-8250-83e7ad8f4dc6.png" class="w-full max-w-2xl mx-auto rounded-xl shadow-md border">
            </div>
        </div>
    </div>

    <!-- SLIDE DASHBOARD 18 -->
    <div class="slide" id="slide-dash-18">
        <div class="max-w-5xl w-full text-center">
            <div class="planet-card p-10 text-left border shadow-lg bg-white">
                <h3 class="text-3xl font-bold mb-6 text-gray-800 text-center">18. Jalur Komunikasi dengan Tim Akademik</h3>
                <p class="text-xl text-gray-700 mb-8 text-center">Sistem ini dibuat untuk kolaborasi. Apabila Anda memiliki gagasan baru, saran pengembangan, temuan bug di sistem, atau sekadar ingin berkonsultasi, Anda difasilitasi penuh untuk menghubungi Tim Akademik. Anda dapat mengirimkan pesan email secara langsung melalui menu integrasi yang tersedia di dashboard, atau untuk respon yang lebih cepat, Anda selalu dipersilakan untuk memulai diskusi secara leluasa di dalam grup channel komunikasi khusus yang disediakan untuk para pengajar.</p>
                <img src="https://cdn-web-2.ruangguru.com/landing-pages/assets/eca932df-46c8-4be8-9fe5-d8982131e15d.png" class="w-full max-w-lg mx-auto rounded-xl shadow-md border">
            </div>
        </div>
    </div>
"""

new_content = content[:start_idx] + new_slides + "\n" + content[end_idx:]

with open('panduan-scl.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Replaced slides successfully.")
