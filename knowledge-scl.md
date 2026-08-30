# SCL Repository Notes

## GitHub repository

- Repository utama B2C: `https://github.com/kalanantiacademics/B2C.git`
- Remote lokal: `b2c`
- Branch deployment: `main`
- SSH host/key label: `new-yazid-mac`
- SSH fingerprint: `SHA256:Dns6nijOYoN1tAeOkmLncMERfUN+0LOZ9mU0CdQ2VAQ`

## Dashboard device policy

### Student dashboard

Folder: `student-dashboards/`

- Hanya tablet, laptop, dan desktop yang diperbolehkan.
- HP diblokir dalam portrait, landscape, dan mode **Situs desktop**.
- Aturan perangkat dipusatkan di `device-guard.js` dan tampilan penolakan di `device-guard.css`.
- Kedua file tersebut harus tetap dimuat oleh `index.html`, `dashboard.html`, `sessions.html`, `materials.html`, dan `quiz.html`.

### Teacher dashboard

Folder: `teacher-dashboard/`

- Teacher dashboard mendukung HP, tablet, laptop, dan desktop.
- Aturan responsif bersama berada di `mobile-ready.css`.
- File tersebut harus tetap dimuat oleh seluruh halaman utama teacher dashboard.
- Pada mobile, tabel dapat digeser horizontal, modal mengikuti tinggi layar, curriculum detail berubah menjadi layout dokumen, dan sidebar panduan berubah menjadi pemilih topik horizontal.
