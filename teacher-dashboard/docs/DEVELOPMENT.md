> **Fungsi dokumen:** panduan kerja developer untuk memahami file dan melakukan perubahan pada Teacher Dashboard.
>
> **Baca ketika:** akan mengembangkan, memperbaiki, atau memeriksa file teacher dashboard.
>
> **Bukan untuk:** panduan penggunaan guru atau deployment produksi. Gunakan `TEACHER-GUIDE.md` atau `DEPLOYMENT.md`.

# Development Guide — Teacher Dashboard

Dokumen ini berisi penjelasan fungsi tiap file di folder `teacher-dashboard` agar memudahkan pengembangan dan referensi bagi AI Agent.

---

## 🖥️ 1. Frontend & Core Pages
Halaman utama yang diakses oleh user (Teacher/Admin).

| Nama File | Deskripsi |
| :--- | :--- |
| `index.html` | Entry point utama (halaman login atau landing). |
| `dashboard.html` | Dashboard utama guru: Ringkasan kelas, jadwal, dan statistik. |
| `class-detail.html` | Detail absensi siswa, progres belajar, dan input observasi. |
| `curriculum.html` | Daftar semua level kurikulum (Python, Roblox, dll). |
| `curriculum-detail.html` | Detail silabus tiap level dan akses ke materi (slides). |
| `panduan-scl.html` | Slide panduan pengajaran *Student Centered Learning* (SCL). |

---

## ⚙️ 2. Backend & Integration
Logika yang menghubungkan dashboard dengan database (Google Sheets).

| Nama File | Deskripsi |
| :--- | :--- |
| `apps-script/code-teacher.gs` | **Google Apps Script.** Berisi API backend untuk fetch data dari spreadsheet, save absensi, dan simpan catatan guru. |
| `archive/legacy-maintenance/SCRIPT_TINGGAL_COPY_AJA.js` | Script helper (JS) untuk mempercepat integrasi atau update data via console. Disimpan sebagai arsip dan tidak dipakai langsung oleh dashboard. |

---

## 🐍 3. Maintenance Tools (Python Scripts)
Script otomatisasi untuk mengedit file HTML (terutama `panduan-scl.html`) telah diarsipkan di folder `archive/legacy-maintenance/` agar tidak bercampur dengan file inti dashboard.

| Nama File | Deskripsi |
| :--- | :--- |
| `archive/legacy-maintenance/add_slide4.py` | Menambahkan slide "Learning Journey" baru di urutan ke-4 dan update urutan slide lainnya. |
| `archive/legacy-maintenance/update_slides.py` / `archive/legacy-maintenance/replace_slides.py` | Melakukan update konten slide secara massal tanpa edit manual satu-satu. |
| `archive/legacy-maintenance/inject_sales.py` | Menyisipkan kotak "Sales Angle" (tips jualan ke ortu) ke dalam slide materi. |
| `archive/legacy-maintenance/fix_ids.py` | Memperbaiki ID slide yang duplikat atau berantakan setelah proses edit. |
| `archive/legacy-maintenance/fix_layout.py` / `archive/legacy-maintenance/fix_css.py` | Memperbaiki masalah visual (seperti vertical centering atau alignment tombol) secara otomatis. |
| `archive/legacy-maintenance/fix_all.py` | Menjalankan serangkaian perbaikan layout sekaligus (Batch Fix). |
| `archive/legacy-maintenance/check_sales_boxes.py` | Memastikan semua slide sudah memiliki kotak sales yang diperlukan. |
| `archive/legacy-maintenance/find_flex.py` | Mencari container flexbox tertentu untuk troubleshooting layout. |

---

## 💡 Instruksi untuk AI Agent
Jika Anda diminta untuk memodifikasi proyek ini:
1. **Perubahan Visual Dashboard:** Fokus pada `dashboard.html` atau `class-detail.html`.
2. **Perubahan Data/API:** Cek `apps-script/code-teacher.gs`.
3. **Menambah/Mengubah Slide Panduan:** Jangan edit manual file HTML jika perubahannya massal. Gunakan atau buat script Python baru (seperti `archive/legacy-maintenance/add_slide4.py`) agar penomoran slide tetap konsisten otomatis.
4. **Validasi:** Setelah edit manual pada slide HTML, jalankan `archive/legacy-maintenance/fix_ids.py` untuk memastikan navigasi tidak rusak.

---
*Terakhir diupdate: 15 Mei 2026*
