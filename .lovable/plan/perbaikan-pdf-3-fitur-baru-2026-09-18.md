# Perbaikan PDF + 3 Fitur Baru

## 1. Perbaikan: PDF tidak bisa jadi catatan

Masalah: file PDF dikirim utuh (sampai 100 MB) ke AI sebagai satu berkas. PPT yang diekspor jadi PDF biasanya berupa gambar halaman, sehingga AI sering menolak atau gagal membacanya dan proses berhenti tanpa hasil.

Perbaikan:
- Baca PDF langsung di perangkat: ambil teks per halaman.
- Kalau halaman ternyata tidak punya teks (PDF hasil scan/ekspor PPT), halaman itu diubah jadi gambar dan dibaca AI sebagai gambar (maksimal sekitar 40 halaman gambar sekali proses, sisanya diproses bertahap).
- Pesan kesalahan jadi jelas: "PDF terkunci", "PDF tanpa teks — dibaca sebagai gambar", "terlalu besar", bukan gagal diam-diam.
- Indikator kemajuan per halaman saat membaca PDF.

## 2. Score Predictor & Analitik UTBK

- Mesin perhitungan estimasi skor skala 200–1000 memakai bobot tingkat kesulitan soal (pendekatan IRT sederhana) dari riwayat latihan yang sudah tersimpan.
- Pemakai memilih PTN & jurusan target; layar membandingkan estimasi skor sekarang dengan perkiraan nilai ambang target lewat grafik radar dan progress bar per mata uji.
- Daftar kampus/jurusan bawaan (bisa dicari), plus penyimpanan target pribadi.
- Halaman baru: Prediksi Skor.

## 3. Perencana Belajar Adaptif

- Sistem membaca topik yang sering salah dari riwayat latihan, lalu AI menyusun rencana belajar harian sampai tanggal ujian.
- Agenda harian bisa dicentang; centang menambah rentetan (streak) dan memengaruhi proyeksi skor.
- Bisa buat ulang rencana kapan saja bila kelemahan berubah.
- Halaman baru: Rencana Belajar.

## 4. Lecture Transcriber ("rekaman jadi apa saja")

- Rekam langsung dari mikrofon dengan visual gelombang suara, atau unggah berkas audio (mp3/wav/m4a).
- Hasil rekaman diubah jadi transkrip teks lengkap dan disimpan.
- Satu klik mengubah transkrip menjadi: catatan rapi (masuk ke daftar catatan), soal latihan STEM, naskah podcast (ke Auditory Studio), atau teka-teki logika (ke Kinesthetic Lab).
- Halaman baru: Transkrip Kuliah.

## 5. Navigasi

Tiga menu baru ditambahkan ke bilah navigasi utama: Prediksi Skor, Rencana Belajar, Transkrip Kuliah — tetap satu baris dan bisa digeser di layar kecil.

## Catatan teknis

- Model AI: tetap memakai Lovable AI yang sudah terpasang di aplikasi ini (kunci API sudah tersedia di sisi server dan tidak pernah dikirim ke browser). Permintaan memakai OpenRouter dengan kunci di sisi browser tidak dipakai karena akan membocorkan kunci; hasil dan kualitasnya setara.
- Sumber data kelemahan & skor: tabel latihan STEM yang sudah ada (`stem_quiz_sessions`, `stem_quiz_questions`), bukan tabel `quiz_results`/`weakness_tracker` baru — data historis pemakai jadi langsung terpakai.
- Tabel baru (semua dengan RLS `auth.uid() = user_id` + GRANT): `target_campuses` (katalog publik, hanya baca), `user_utbk_predictions`, `user_study_plans`, `user_study_tasks`, `lecture_transcripts`.
- Struktur file: `src/features/utbk/`, `src/features/planner/`, `src/features/lecture/` (komponen + hook + util IRT), server function di `src/lib/*.functions.ts` sesuai pola yang ada.
- Rute baru di `src/routes/_authenticated/`: `predictor.tsx`, `planner.tsx`, `lecture.tsx`.
- Grafik memakai Recharts (sudah terpasang), ikon Lucide, gaya mengikuti token desain yang ada.
- Setelah selesai: pengecekan tipe + uji jalan di browser (unggah PDF hasil ekspor PPT, rekam audio pendek, buat rencana belajar, hitung prediksi skor).
