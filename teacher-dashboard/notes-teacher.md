# 🍎 Teacher Dashboard - Project Documentation

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
| `code-teacher.gs` | **Google Apps Script.** Berisi API backend untuk fetch data dari spreadsheet, save absensi, dan simpan catatan guru. |
| `SCRIPT_TINGGAL_COPY_AJA.js` | Script helper (JS) untuk mempercepat integrasi atau update data via console. |

---

## 🐍 3. Maintenance Tools (Python Scripts)
Script otomatisasi untuk mengedit file HTML (Terutama untuk `panduan-scl.html` yang memiliki banyak slide).

| Nama File | Deskripsi |
| :--- | :--- |
| `add_slide4.py` | Menambahkan slide "Learning Journey" baru di urutan ke-4 dan update urutan slide lainnya. |
| `update_slides.py` / `replace_slides.py` | Melakukan update konten slide secara massal tanpa edit manual satu-satu. |
| `inject_sales.py` | Menyisipkan kotak "Sales Angle" (tips jualan ke ortu) ke dalam slide materi. |
| `fix_ids.py` | Memperbaiki ID slide yang duplikat atau berantakan setelah proses edit. |
| `fix_layout.py` / `fix_css.py` | Memperbaiki masalah visual (seperti vertical centering atau alignment tombol) secara otomatis. |
| `fix_all.py` | Menjalankan serangkaian perbaikan layout sekaligus (Batch Fix). |
| `check_sales_boxes.py` | Memastikan semua slide sudah memiliki kotak sales yang diperlukan. |
| `find_flex.py` | Mencari container flexbox tertentu untuk troubleshooting layout. |

---

## 💡 Instruksi untuk AI Agent
Jika Anda diminta untuk memodifikasi proyek ini:
1. **Perubahan Visual Dashboard:** Fokus pada `dashboard.html` atau `class-detail.html`.
2. **Perubahan Data/API:** Cek `code-teacher.gs`.
3. **Menambah/Mengubah Slide Panduan:** Jangan edit manual file HTML jika perubahannya massal. Gunakan atau buat script Python baru (seperti `add_slide4.py`) agar penomoran slide tetap konsisten otomatis.
4. **Validasi:** Setelah edit manual pada slide HTML, jalankan `fix_ids.py` untuk memastikan navigasi tidak rusak.

---
*Terakhir diupdate: 15 Mei 2026*
