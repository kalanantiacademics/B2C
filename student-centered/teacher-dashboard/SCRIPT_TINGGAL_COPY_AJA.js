function autoGenerateSlides() {
  var presentationId = '1mFsUp7wSncIfaawtxMUvXo9ca8jAwhMZ2QRzM2QV74w';
  var presentation = SlidesApp.openById(presentationId);
  var slides = presentation.getSlides();
  
  if (slides.length > 2) {
    for (var k = slides.length - 1; k >= 2; k--) {
      slides[k].remove();
    }
  }
  
  var slideData = [
  {
    "title": "",
    "badge": "",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "1 / 47"
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "SCL Journey Map",
    "badge": "RINGKASAN ALUR SCL",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "👨‍🎓 Murid (Eksplorator)"
          }
        ],
        "color": "#EFF6FF"
      },
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "👩‍🏫 Guru (Fasilitator)"
          }
        ],
        "color": "#F0FDF4"
      },
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "👪 Orang Tua (Observer)"
          }
        ],
        "color": "#FEF9C3"
      }
    ]
  },
  {
    "title": "Tantangan Pengalaman Belajar",
    "badge": "BAB 1: URGENSI",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Mengapa model lama kurang efektif?"
          },
          {
            "type": "body",
            "text": "Masalah Utama: Murid kesulitan untuk benar-benar memahami materi secara mendalam."
          },
          {
            "type": "body",
            "text": "Hal ini terjadi karena guru harus secara ketat mengikuti jadwal yang kaku , sehingga membatasi pemahaman dan langkah belajar yang dipersonalisasi untuk setiap anak."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Kendala Administratif (1/2)",
    "badge": "",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Kita terikat aturan: \"Setiap kelas harus terdiri dari murid pada level yang sama.\""
          }
        ],
        "color": "#EFF6FF"
      },
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Jika hanya ada 1-2 murid di Level 2 yang tersedia di hari Sabtu, kita terpaksa membuka satu kelas penuh dan menugaskan guru penuh waktu hanya untuk mereka."
          }
        ],
        "color": "#EFF6FF"
      }
    ]
  },
  {
    "title": "Kendala Administratif (2/2)",
    "badge": "",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "2. Keterbatasan Ruang (\"Borrowed Space\" Issue)"
          },
          {
            "type": "body",
            "text": "• Fakta: Ketersediaan ruang di cabang sangat terbatas."
          },
          {
            "type": "body",
            "text": "• Dilema: Murid Lvl 1, 2, dan 3 ingin belajar bersamaan, tapi hanya ada 1 ruangan kosong."
          },
          {
            "type": "body",
            "text": "• Realita: Kital menolak atau menunda kelas karena tidak bisa mencampur level anak—padahal secara fisik ruangannya muat."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "3. Jadwal Kaku (Scheduling Nightmare)"
          },
          {
            "type": "body",
            "text": "• Fakta: Menyinkronkan jadwal guru, ruangan & anak sangat pusing."
          },
          {
            "type": "body",
            "text": "• Dilema: Kelas baru bisa mulai jika kuota murid level sama terpenuhi."
          },
          {
            "type": "body",
            "text": "• Realita: Kita kehilangan BANYAK prospek murid karena jadwal tidak fleksibel; mereka bosan menunggu kuota kelas penuh."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Kesimpulan Akar Masalah",
    "badge": "",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "• Jadwal yang kaku membatasi personalisasi pacing belajar anak."
          },
          {
            "type": "body",
            "text": "• Inisiensi operasional akibat fixed cost untuk grup kecil (20% utilitas)."
          },
          {
            "type": "body",
            "text": "• Keterbatasan ruang memicu penolakan murid karena beda level tak bisa digabung."
          },
          {
            "type": "body",
            "text": "• Penjadwalan infleksibel membuat potensi prospek murid hilang sia-sia."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Bayangkan Dampaknya! 🌟"
          },
          {
            "type": "body",
            "text": "Jika kita bisa memecahkan batasan ini: Murid lebih aktif, resource lebih optimal, kapasitas ekspansi luas, & jadwal fleksibel. Saatnya merevolusi pengalaman belajar!"
          }
        ],
        "color": "#FEF9C3"
      }
    ]
  },
  {
    "title": "The Solution:",
    "badge": "BAB 2: SOLUSI KITA",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "(Student Centered Learning)"
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Apa itu SCL?",
    "badge": "DEFINISI",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Student Centered Learning adalah pendekatan edukasi yang menggeser fokus dari instruksi guru menuju kebutuhan, kemampuan, minat, dan gaya belajar dari murid itu sendiri."
          },
          {
            "type": "body",
            "text": "Pendekatan ini menekankan pembelajaran aktif (active learning), di mana murid secara langsung terlibat dalam problem-solving, critical thinking, dan kolaborasi, sehingga mereka mengambil tanggung jawab atas proses pembelajarannya sendiri."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Karakteristik & Hasil SCL",
    "badge": "",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Keuntungan Utama"
          },
          {
            "type": "body",
            "text": "Mendorong pengalaman belajar terpersonalisasi, pemahaman materi lebih dalam, dan memupuk autonomy, motivation, & lifelong learning ."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Pacing Mandiri"
          },
          {
            "type": "body",
            "text": "Murid dapat belajar di kecepatannya masing-masing (own paced) . Tidak ditahan oleh yang lambat, tidak tertinggal oleh yang cepat."
          }
        ],
        "color": "#EFF6FF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Eksplorasi & Bantuan Teman Sebaya"
          },
          {
            "type": "body",
            "text": "Melatih mereka mengeksplorasi masalah mandiri, dan bertanya/diskusikan dengan temannya (peer tutor) terlebih dahulu mencari solusi sebelum bertanya pada guru."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Keterlibatan Guru (Kalananti vs Lainnya)",
    "badge": "BAB 3: PERBEDAAN KALANANTI",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "🏛️ Model Lainnya"
          },
          {
            "type": "body",
            "text": "Di model SCL tradisional lainnya, guru seringkali hanya menjadi \"pasif\" dengan peran sebatas fasilitator santai atau memberi instruksi seragam secara massal."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "🚀 KALANANTI SCL"
          },
          {
            "type": "body",
            "text": "Di Kalananti, guru tetap proaktif terlibat (proactively engaged) !"
          },
          {
            "type": "body",
            "text": "Bukan sekadar fasilitator diam, melainkan instruktur dedikatif yang menyalurkan panduan personal mendalam yang disesuaikan (tailored) untuk tingkat kemampuan beda-beda tiap anak di ruangan tersebut!"
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Pedagogi: Fasilitator, Bukan Diktator",
    "badge": "SUDUT PANDANG",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Paradigma utama SCL adalah berhentinya guru dari menyetir pembelajaran anak."
          },
          {
            "type": "body",
            "text": "Tindakan otoriter seperti memegang mouse milik murid, mengetikkan kodenya, atau mendemonstrasikan semuanya di papan tulis DILARANG KERAS di SCL."
          },
          {
            "type": "header",
            "text": "Biarkan anak berbuat salah, dan biarkan anak yang memegang kontrol devicenya 100%."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Bahasa Tubuh Guru SCL",
    "badge": "GEOMETRI INTERAKSI",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "❌ Otoriter (Berdiri)"
          },
          {
            "type": "body",
            "text": "Guru menunduk mengayomi, membayangi (overshadow) layar anak dari belakang sambil tangannya menunjuk-nunjuk layar. Ini membuat murid merasa dikendalikan & gelisah."
          }
        ],
        "color": "#FEF2F2"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "✅ Kolaboratif (Jongkok / Duduk)"
          },
          {
            "type": "body",
            "text": "Guru harus merendahkan pandangannya agar \"Eye-Level\" (sejajar secara mata) atau sedikit di pinggir sisi (bersebelahan). Ini memicu rasa dialog partnership (mitra belajar), bukan boss!"
          }
        ],
        "color": "#F0FDF4"
      }
    ]
  },
  {
    "title": "Prinsip Open Space",
    "badge": "TATA RUANG SCL",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Dalam SCL, ruang kelas bukan lagi tempat di mana semua mata tertuju ke depan (ke arah guru). Ruang kelas harus menjadi Open Space yang dirancang untuk:"
          },
          {
            "type": "body",
            "text": "• Menghilangkan Sekat Otoritas: Guru tidak mendominasi panggung depan."
          },
          {
            "type": "body",
            "text": "• Memudahkan Kolaborasi: Siswa mudah berputar kursi dan membentuk kelompok diskusi kecil tanpa terhalang dinding."
          },
          {
            "type": "body",
            "text": "• Mobilitas Guru Cekatan: Guru bisa bergerak bermanuver (went around) ke setiap sisi meja murid tanpa terhalang."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Layout \"Ruang Sidang\" (Reguler)",
    "badge": "KESALAHAN LAYOUT #1",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Teacher Desk Desk Desk Desk Desk Desk HINDARI"
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Mengapa Ini Gagal?"
          },
          {
            "type": "body",
            "text": "• Semua murid terpaksa menghadap ke satu titik (Teacher)."
          },
          {
            "type": "body",
            "text": "• Memicu \"Nervousness\": Atmosfer kaku, formal, seperti ujian/sidang."
          },
          {
            "type": "body",
            "text": "• Keterbukaan Gagal: Canggung menoleh 180° untuk tanya."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Layout \"Menghadap Dinding\"",
    "badge": "KESALAHAN LAYOUT #2",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Teacher Desk Desk Desk Desk ANTI-SOSIAL"
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Mengapa Ini Buruk?"
          },
          {
            "type": "body",
            "text": "• Siswa menatap tembok kosong atau sudut mati."
          },
          {
            "type": "body",
            "text": "• Sekat Komunikasi Tingkat Tinggi: Jika butuh bantuan teman, mereka harus memundurkan kursi dan berbalik badan total, yang sangat menguras energi & canggung."
          },
          {
            "type": "body",
            "text": "• Sangat tertutup bagi Peer-Tutoring spontan."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Best Practice: \"Center Space\"",
    "badge": "LAYOUT SCL IDEAL",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Teacher Desk Desk Desk Desk CENTER SPACE"
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Menghadirkan Keterbukaan"
          },
          {
            "type": "body",
            "text": "• Saling Berhadapan: Meja diposisikan menghadap titik pusat. Anak dapat melihat wajah semua teman sekelasnya."
          },
          {
            "type": "body",
            "text": "• Minta Bantuan Super Cepat: Cukup menoleh ke kanan/kiri tanpa memutar kursi, atau cukup *berbisik* ke anak di seberang meja."
          }
        ],
        "color": "#F0FDF4"
      }
    ]
  },
  {
    "title": "Pemanfaatan \"Center Space\"",
    "badge": "TATA RUANG SCL",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Adanya ruang kosong melompong yang luas di tengah lingkaran meja ini bukanlah sesuatu yang tidak disengaja. Di SCL, *Center Space* berfungsi sebagai panggung aktivitas!"
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "The SCL Ecosystem",
    "badge": "PETA KEKUATAN",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Modul Cetak"
          },
          {
            "type": "body",
            "text": "Peta offline berisi instruksi To-Do-List dan bagian Evaluasi (Quiz)."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Interactive (INS)"
          },
          {
            "type": "body",
            "text": "Portal Mission Control rahasia bagi murid melihat bocoran petunjuk GIF (scaffolding)."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Teacher Dashboard"
          },
          {
            "type": "body",
            "text": "Papan kontrol guru memantau kemajuan ruang kelas, memberikan grading, dan poin."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Satu Ruangan, Beda Level",
    "badge": "OPERASIONAL KELAS",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Dilema Administratif vs Solusi KBM"
          },
          {
            "type": "body",
            "text": "Dulu, 1 kelas reguler butuh minimal 4 anak dengan level yang persis sama. Jika ada 2 anak L1 dan 4 anak L2, mereka tidak bisa digabung, mengacaukan operasional."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Class Preparation (Sebelum Kelas)",
    "badge": "TIMELINE SCL",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "🖨️ Logistik Modul & INS"
          },
          {
            "type": "body",
            "text": "• Print out Modules fisik sesuai level tiap anak."
          },
          {
            "type": "body",
            "text": "• Pastikan koneksi internet PC anak stabil."
          },
          {
            "type": "body",
            "text": "• Siapkan link Dashboard student (INS) di browser anak."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "🪑 Setingan Ruang"
          },
          {
            "type": "body",
            "text": "• Pinggirkan meja, sisakan tengah yang melompong!"
          },
          {
            "type": "body",
            "text": "• Cek Dashboard Guru di iPad / Laptop milik mentor."
          },
          {
            "type": "body",
            "text": "• Siapkan materi (jokes) Ice Breaking pembuka."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Rundown 60 Menit",
    "badge": "TIMELINE SCL",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Shared Activity (Pemanasan)"
          },
          {
            "type": "body",
            "text": "Lesehan di Center Space, ice breaking bareng mengaburkan canggung."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Inti KBM SCL"
          },
          {
            "type": "body",
            "text": "Membuka modul, eksekusi INS, Guru keliling one-by-one ."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Closing Sesi"
          },
          {
            "type": "body",
            "text": "Grading pencapaian kemajuan, show & tell, Leaderboard!"
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "10' Shared Activity",
    "badge": "10 MENIT PERTAMA",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Tujuan Kegiatan"
          },
          {
            "type": "body",
            "text": "• Mengagrabkan sesama murid lintas level (bonding)."
          },
          {
            "type": "body",
            "text": "• Menghancurkan kecanggungan sosial sedini mungkin."
          },
          {
            "type": "body",
            "text": "• Adaptif: Kegiatannya ngobrol receh, game kecil tebak kata ruang kosong."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Mengatasi Kevakuman"
          },
          {
            "type": "body",
            "text": "Selain menyatukan murid, ini digunakan untuk mengisi jeda menunggu anak yang datangnya late secara alami, sehingga materi praktikum tidak akan tertinggal."
          }
        ],
        "color": "#FEF08A"
      }
    ]
  },
  {
    "title": "Kevakuman \"Late Students\"",
    "badge": "SHARED ACTIVITY EXTENSION",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Penyakit kelas reguler: Setengah kelas diam garing stres menunggu 1 murid yang kena macet."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "The End Goal: \"Peer Tutoring\"",
    "badge": "CORE PURPOSE",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Mengapa membangun keakraban (Shared Act) di 10 menit awal itu MUTLAK?"
          },
          {
            "type": "body",
            "text": "🚨 Masalah Umum: Murid sangat gengsi/enggan meminta bantuan anak di meja sebelahnya karena merasa SKSD (awkward) ."
          },
          {
            "type": "body",
            "text": "💡 Output SCL: Jika dinding sungkan ini dihancurkan saat nge-game tadi, ketika KBM koding dimulai, mereka asik saja menoleh: \"Eh Jo, loop punya lu jalan gak? Punya gua error nih bantuin dong!\" (Jadi Mandiri!)."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Inti KBM SCL",
    "badge": "45 MENIT INTI",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "🧒 Rutinitas Sisi Murid"
          },
          {
            "type": "body",
            "text": "• Fokus masuk ke bubble / dunianya masing-masing."
          },
          {
            "type": "body",
            "text": "• Memecahkan misteri kode dari Modul Cetak dan INS Interaktif ."
          },
          {
            "type": "body",
            "text": "• Berteriak/menoleh bertanya ke teman jika stuck ."
          },
          {
            "type": "body",
            "text": "• Submit Task & ngerjain Quiz mandiri."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "👨‍🏫 Manuver Sisi Guru"
          },
          {
            "type": "body",
            "text": "• Guru terus moving (mengelilingi) meja tanpa diam di tengah."
          },
          {
            "type": "body",
            "text": "• Melihat monitor anak bukan membayangi, tapi sejajar ."
          },
          {
            "type": "body",
            "text": "• Memantau Dashboard Guru (Siapa yang task-nya error)."
          },
          {
            "type": "body",
            "text": "• Suntik Clue kecil (Scaffolding), lalu tinggalkan lagi."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Closing Sesi",
    "badge": "5 MENIT TERAKHIR",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "• Show & Tell Terbuka: Minta anak berdiri dari PC, kumpul lesehan kembali. Beri waktu mereka Pamer Singkat karyanya ke anak lain."
          },
          {
            "type": "body",
            "text": "• Penilaian (Grading & Validasi Task): Guru merekap quiz di Dashboard."
          },
          {
            "type": "body",
            "text": "• Tayangkan Leaderboard! Proyeksikan papan klasemen poin StarChamps di TV/dinding agar hype kompitisi positif memuncak!"
          }
        ],
        "color": "#F0FDF4"
      }
    ]
  },
  {
    "title": "Modul Cetak SCL",
    "badge": "PROPERTI EKSKAVASI",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "1. Offline First"
          },
          {
            "type": "body",
            "text": "Membiasakan anak membaca dokumen fisik terlebih dahulu untuk mengurangi screen fatigue dan mengasah literasi murni."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "2. Visual & Step-by-Step"
          },
          {
            "type": "body",
            "text": "Isinya sarat akan infografis, glosarium, dan checklist praktikum mandiri yang tidak butuh ceramah."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Anatomi Modul (Bagian 1: Pembuka & Outline)",
    "badge": "ANATOMI MODUL",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Bagian pembuka setiap modul yang menjelaskan tujuan belajar utama dan apa yang akan dipelajari di sesi itu."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Isi utama modul: penjelasan, tahapan kerja, gambar panduan, dan urutan aktivitas yang perlu diikuti murid."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Anatomi Modul (Bagian 2: Kosakata & Wawasan)",
    "badge": "ANATOMI MODUL",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Penjelasan istilah coding penting. Di modul akan muncul sebagai bubble “Tutor says...” untuk bantu murid memahami kosakata baru."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Tambahan wawasan singkat. Ini dipakai untuk memberi konteks atau fun fact supaya murid lebih paham konsep yang sedang dipelajari."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Anatomi Modul (Bagian 3: Praktikum & Evaluasi)",
    "badge": "ANATOMI MODUL",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "5. Must Do"
          },
          {
            "type": "body",
            "text": "Tugas inti yang wajib dikerjakan murid. Ini target minimum yang harus selesai di setiap modul."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "6. Should Do & Aspire To Do"
          },
          {
            "type": "body",
            "text": "Latihan pengayaan. “Should Do” untuk tantangan lanjutan yang disarankan, dan “Aspire To Do” untuk eksplorasi yang menantang."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "7. Mini Quiz"
          },
          {
            "type": "body",
            "text": "Bagian evaluasi singkat di akhir modul untuk mengecek pemahaman murid sebelum lanjut ke sesi berikutnya."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Modul Cetak VS Platform INS",
    "badge": "INTEGRASI PLATFORM",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Modul Cetak Fisik:"
          },
          {
            "type": "body",
            "text": "Sangat ringkas, terbatas di 2 lembar kertas (karena hemat biaya cetak materi cabang). Isinya To-Do-List instruksi dan gambar statis global."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "INS (Dashboard Murid):"
          },
          {
            "type": "body",
            "text": "Berisi materi yang sifatnya SUPER DETAIL (GIF bergeraknya, video tutor, kode mendalam presisi, hingga spoiler rahasia)."
          }
        ],
        "color": "#FEF9C3"
      }
    ]
  },
  {
    "title": "The \"Three BEFORE Me\" Rule",
    "badge": "STRATEGI MENGAJAR",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Aturan besi SCL: Siswa DILARANG keras langsung bertanya ke Guru saat stuck! Mereka wajib melewati 3 filter problem-solving mandiri:"
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "\"Kak! Tolong ini ngga berhasil gimana?\"",
    "badge": "KASUS #1: ANAK GAK SABARAN",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "❌ Apa yang Guru BIASA lakukan:"
          },
          {
            "type": "body",
            "text": "Buru-buru lari nyamperin si manis, lalu mengetikkan kodenya langsung di keyboard anak supaya cepat beres dan anak berhenti merengek."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "✅ Apa yang Guru SCL kelakuan:"
          },
          {
            "type": "body",
            "text": "\"Tunda sejenak. Kamu udah minta tolong 'Buddy' teman sebelahmu belum? Terus kamu udah cek Slide Interaktif di akun INS kamu? Coba kamu baca buka INS nya bareng aku dulu, ikutin GIF-nya, lalu bilang ke kakak apa yang terjadi.\""
          }
        ],
        "color": "#F0FDF4"
      }
    ]
  },
  {
    "title": "Mengapa Wajib Mengecek INS?",
    "badge": "MENGAPA?",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Seperti disinggung sebelumnya, Modul fisik hanyalah blueprint singkat. Semua instruksi valid bergeraknya ada di Interactive Slide (INS) ."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "The Art of Scaffolding",
    "badge": "THE ART OF TEACHING",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "👎 Direct Answer (Buruk): \"Pencet tombol spasi. Klik tombol hijau yang ada tulisan 'Run' itu loh.\""
          },
          {
            "type": "body",
            "text": "🔥 Scaffolding (SCL Pro): \"Coba lihat petunjuk nomor 3... Dia minta kita menjalankan script. Kalau di aplikasi ini, tombol untuk menjalankan biasanya letaknya di mana yang warnanya mencolok dan logonya 'Play'?\""
          }
        ],
        "color": "#EFF6FF"
      }
    ]
  },
  {
    "title": "\"Kak! Aku tetep ga ngerti ini disuruh apa!\"",
    "badge": "KASUS #2: GAK NGERTI BACA",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "❌ Kesalahan Guru Biasa:"
          },
          {
            "type": "body",
            "text": "Guru langsung merangkum paragraf modul dan membuatkan kodenya (\"Oh ini maksudnya disuruh bikin loop ke arah sini\"). Anak akan kehilangan kemampuan mencerna bahasa."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "✅ Guru SCL: (Membaca Bareng)"
          },
          {
            "type": "body",
            "text": "\"Oke, bagian mana yang membingungkan? Mari kita baca bareng kalimat pertama ya. 'Ulangi step di atas 5 kali'... Berarti menurut kamu, kode apa yang pas buat ngatur jumlah ulangan?\" (Decoding kalimat instruksi bersama)."
          }
        ],
        "color": "#F0FDF4"
      }
    ]
  },
  {
    "title": "Membangun Peer Tutoring Silang",
    "badge": "THE ART OF TEACHING",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Mengkondisikan Sang Tutor:"
          },
          {
            "type": "body",
            "text": "Tidak ada anak yang suka disuruh mengurusi problem temannya tiba-tiba jika mereka masih seru dengan kodingannya sendiri. Ajak dia menjadi \"Kakak\" dengan pujian halus."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Contoh Manuver:"
          },
          {
            "type": "header",
            "text": "\"Farel, Kakak lihat kamu jago banget nih pasang sensornya, super fast! Sebelah kiri mu ada Bima lagi bingung pasang blok loop, boleh tolong tutorin Bima bentar rel? Nanti kakak kasih star tambahan khusus deh buat mentor Farel!\""
          }
        ],
        "color": "#EFF6FF"
      }
    ]
  },
  {
    "title": "Terjebak \"Ceramah Mikro\"",
    "badge": "KESALAHAN FATAL",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Banyak guru bangga sudah menghindari ceramah depan kelas. Tapi saat mendampingi 1 anak yang pelan, guru malah melakukan Ceramah Mikro (Micro Lecture) yang memakan waktu 15 menit penuh."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Check for Understanding (C4U)",
    "badge": "MENGAJAR EFEKTIF",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Dalam menularkan instruksi, jangan berasumsi anak mengerti hanya karena mereka manggut-manggut. Di SCL kita mengharuskan anak memvalidasi pemahamannya."
          },
          {
            "type": "body",
            "text": "• ❌ Jauhkan kalimat \"Udah ngerti belum?\" (90% anak pemalu akan bohong dan jawab \"Udah kak\")."
          },
          {
            "type": "body",
            "text": "• ✅ Guru SCL bertanya: \"Oke, coba kamu ceritakan ulang ke Kakak pakai bahasa kamu sendiri, fungsi dari blok loop warna orange tadi tuh untuk ngapain jadinya?\""
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "Kasus Dinamika: Anak Super Dominan",
    "badge": "MANAJEMEN KELAS",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Profil (Sok Tahu & Cepat):"
          },
          {
            "type": "body",
            "text": "Anak yang paling berisik, merasa sudah jago IT, selesainya terlalu cepat, dan sering mengganggu teman sekelas dengan ikut campur merampas PC temannya (seolah dia Gurunya)."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Strategi Menjinakkan:"
          },
          {
            "type": "body",
            "text": "• Jadikan dia Asisten (Penyaluran Energi): Validasi egonya. Berikan dia otoritas membantu anak lain tapi tanpa menyentuh mouse kawannya (Strict Rules)."
          },
          {
            "type": "body",
            "text": "• Tegas Meminta Rem / Jarak: \"Kamu keren banget idenya, tapi biarkan Doni mikir dulu ya. Doni ga bakal hebat kalo kamu teriakkin jawabannya terus dari sana.\""
          }
        ],
        "color": "#F0FDF4"
      }
    ]
  },
  {
    "title": "Kasus Dinamika: Anak Terlalu Pasif",
    "badge": "MANAJEMEN KELAS",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Profil (Invisible / Pemalu):"
          },
          {
            "type": "body",
            "text": "Anak pendiam introvert, pasif diam bengong memandang layar saja dan sama sekali tak pernah komplain / mengangkat tangan meski tertinggal jauh."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Strategi Pendekatan:"
          },
          {
            "type": "body",
            "text": "• The Silent Approach: Jongkok pelan di samping posisinya dengan nada suara super rendah (bisik), jangan buat dia jadi pusat perhatian kelas karena itu membuatnya takut."
          },
          {
            "type": "body",
            "text": "• Bongkar Blokade Mentok: \"Lagi bingung yang mana? Boleh kakak lihat layarnya?\" Puji sekecil apapun usahanya (misal: memuji dia yang udah buka modul) untuk membangun kemanannya."
          }
        ],
        "color": "#EFF6FF"
      }
    ]
  },
  {
    "title": "Kasus Dinamika: Murid Stuck & Guru Sibuk",
    "badge": "MANAJEMEN KELAS",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Situasi (Crash Course) :"
          },
          {
            "type": "body",
            "text": "Seorang anak rewel karena benar-benar murni bingung sebuah konsep (misalnya logika If-Then ), sedangkan sang guru posisinya sedang sibuk mendampingi 3 anak lain yang juga stuck."
          }
        ],
        "color": "#FFFFFF"
      },
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Strategi (Parallel Mini-Project):"
          },
          {
            "type": "body",
            "text": "• Beli Waktu & Fokus: Jangan biarkan sang anak bengong nungguin kamu. Buatkan Mini Challenge (Project kecil di luar project utama) untuk memecahkan kebingungannya sambil kamu mengurus anak lain."
          },
          {
            "type": "body",
            "text": "• Contoh Challenge Singkat: \"Oke, coba kamu buka tab baru, dan bikin balok yang bisa ganti warna kalau diinjak (If-Then).\" Jika kebingungan memikirkan jenis spesifik, jangan sungkan request/tanya ke tim Akademik ya!"
          }
        ],
        "color": "#FEF9C3"
      }
    ]
  },
  {
    "title": "FAQ #1: \"Anak Menolak Membaca Modul Cetak\"",
    "badge": "FAQ / TANYA JAWAB",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Masalah:"
          },
          {
            "type": "body",
            "text": "Anak merengek, \"Ih males baca panjang-panjang, Kakak aja yang bikinin!\" dan mogok kerja."
          },
          {
            "type": "header",
            "text": "Solusi SCL:"
          },
          {
            "type": "body",
            "text": "• Jangan menyerah dan membacakan semuanya. Arahkan anak membaca \"Bersama-Sama\" membagi beban pada satu kalimat pertama ."
          },
          {
            "type": "body",
            "text": "• \"Yaudah, Kakak bacain kalimat ke-1 buat kamu, habis tu kamu baca kalimat ke-2 mau ga?\""
          },
          {
            "type": "body",
            "text": "• Seringkali anak cuma \"takut merasa lelah\" melihat banyak teks di awal. Begitu dibantu membongkar 1 puzzle baris teks, mereka akan lanjut sendiri karena sadar teksnya mudah dipahami."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "FAQ #2: \"Anak Cepat Selesai dan Bosan\"",
    "badge": "FAQ / TANYA JAWAB",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Masalah:"
          },
          {
            "type": "body",
            "text": "Ada murid High-Achiever yang menyelesaikan tugas inti (Must-Do) dalam 15 menit saja, padahal kelas masih sisa 30 menit lagi."
          },
          {
            "type": "header",
            "text": "Solusi SCL:"
          },
          {
            "type": "body",
            "text": "• Arahkan ke bagian Extra Challenge / Aspire To Do / Modul Kosong . Tantang egonya: \"Keren banget kamu udah selesai level Normal super cepat, berani ga coba nyelesaiin mode Hard / Expert ini tanpa instruksi?\" ."
          },
          {
            "type": "body",
            "text": "• Delegasikan tugas Peer-Tutoring: Minta dia berkeliling membantu anak lain sebagai Asisten Mentor dengan imbalan point StarChamps ."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "FAQ #3: \"Orang Tua Protes: Guru Kurang Ngajar\"",
    "badge": "FAQ / TANYA JAWAB",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "header",
            "text": "Masalah:"
          },
          {
            "type": "body",
            "text": "Beberapa orang tua (terutama yang mengintip dari kaca kelas) komplain: \"Kok anak saya didiemin aja baca modul sendiri? Gurunya kok mainin iPad terus berkeliling dan ngga nerangin di depan?\""
          },
          {
            "type": "header",
            "text": "Penjelasan Customer Success:"
          },
          {
            "type": "body",
            "text": "• SCL ( Student Centered Learning ) memang dirancang agar murid sibuk dan guru terlihat santai. Padahal otak anak sedang bekerja aktif."
          },
          {
            "type": "body",
            "text": "• Guru memegang iPad karena sedang menilai dan memantau live tracking layer PC anak via dashboard, bukan bermain HP."
          },
          {
            "type": "body",
            "text": "• Justru jika guru terlalu sering mendikte instruksi (Spoon-feeding), anak akan menjadi robot yang cuma bisa menyalin, menghilangkan tujuan problem solving / resiliensi ."
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "The \"Aha!\" Moments",
    "badge": "EPILOGUE",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Tujuan pamungkas dari SCL Kalananti bukanlah anak bisa membuat game coding sekeren mungkin di hari itu juga (Output Driven)."
          },
          {
            "type": "header",
            "text": "Tujuannya adalah membimbing anak mencari jalan keluar, merakit logikanya sendiri, hingga mereka menepuk mejanya dan berseru riang secara penuh daya cipta: \"AHA! Oh, Aku Ngerti Cara Kerjanya!\""
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  },
  {
    "title": "You Are Now SCL Certified Mentor!",
    "badge": "END OF MANUAL",
    "cards": [
      {
        "paragraphs": [
          {
            "type": "body",
            "text": "Mari ciptakan kelas yang penuh ledakan rasa penasaran, resiliensi , dan kolaborasi terbuka!"
          }
        ],
        "color": "#FFFFFF"
      }
    ]
  }
];
  
  var PAGE_W = 960;
  var PAGE_H = 540;
  var MARGIN = 50;
  
  for (var i = 0; i < slideData.length; i++) {
    var data = slideData[i];
    var slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill("#F8FAFC");
    
    if (data.badge) {
      var badgeBox = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, MARGIN, 30, 200, 30);
      badgeBox.getFill().setSolidFill("#265E9B");
      badgeBox.getBorder().setTransparent();
      var badgeText = badgeBox.getText();
      badgeText.setText(data.badge);
      badgeText.getTextStyle().setForegroundColor("#FFFFFF").setFontFamily("Space Grotesk").setBold(true).setFontSize(12);
      badgeText.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    }
    
    if (data.title && data.title.trim().length > 0) {
      var titleBox = slide.insertTextBox(data.title, MARGIN, 70, Math.max(10, PAGE_W - (MARGIN*2)), 60);
      var titleText = titleBox.getText();
      titleText.getTextStyle().setForegroundColor("#1A4576").setFontFamily("Orbitron").setBold(true).setFontSize(28);
      var isCenter = data.cards.length <= 1;
      if (isCenter) titleText.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    }
    
    var numCards = data.cards.length;
    if (numCards > 0) {
      var cardY = 150;
      var cardH = PAGE_H - cardY - MARGIN;
      var totalGap = (numCards - 1) * 20;
      var cardW = (PAGE_W - (MARGIN*2) - totalGap) / numCards;
      
      for (var c = 0; c < numCards; c++) {
        var cardObj = data.cards[c];
        var cardX = MARGIN + (c * (cardW + 20));
        
        var shape = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cardX, cardY, cardW, cardH);
        shape.getFill().setSolidFill(cardObj.color || "#FFFFFF");
        shape.getBorder().getLineFill().setSolidFill("#CBD5E1");
        shape.setContentAlignment(SlidesApp.ContentAlignment.TOP);
        
        var textRange = shape.getText();
        textRange.clear(); // Ensure it's empty
        
        // Append formatted paragraphs
        for (var p = 0; p < cardObj.paragraphs.length; p++) {
          var paraData = cardObj.paragraphs[p];
          var paragraph = textRange.appendParagraph(paraData.text + "\n");
          
          if (paraData.type === "header") {
            paragraph.getRange().getTextStyle().setBold(true).setForegroundColor("#1E293B").setFontFamily("Space Grotesk").setFontSize(16);
          } else {
            paragraph.getRange().getTextStyle().setBold(false).setForegroundColor("#475569").setFontFamily("Space Grotesk").setFontSize(13);
          }
        } // end loop paragraphs
      } // end loop cards
    } // end if cards
  } // end loop slides
} // end function
