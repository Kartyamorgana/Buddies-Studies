# Study Buddy AI

Buatkan sebuah aplikasi web catatan belajar interaktif bernama "StudyNotes". Aplikasi ini single-page, modern, responsif, dan sepenuhnya berjalan di browser. Gunakan React, Tailwind CSS, dan database bawaan yang disediakan oleh Lovable (misalnya Supabase) untuk menyimpan data. Untuk fitur AI, gunakan AI internal Lovable tanpa meminta pengguna memasukkan API key.

📌 Fitur Utama

1. **Manajemen Catatan (CRUD)**
   - Buat, edit, hapus catatan.
   - Setiap catatan memiliki judul dan konten dalam format Markdown.
   - Sidebar kiri menampilkan daftar catatan berdasarkan folder. Klik langsung membuka catatan, toggle antar catatan cepat.
   - Auto-save setiap perubahan (dengan debounce) langsung ke database.

2. **Folder & Pengelompokan**
   - Struktur folder di sidebar berbentuk tree (expandable) untuk mengorganisasi catatan.
   - Buat, rename, hapus folder.
   - Pindahkan catatan ke folder lain melalui menu klik kanan atau drag & drop.
   - Tampilan folder rapi, bisa collapse/expand.

3. **Editor Catatan Markdown**
   - Tampilan split: kiri editor teks, kanan live preview yang merender Markdown.
   - Toolbar: bold, italic, heading, link, daftar, dan sisipkan code block.
   - **Code block khusus**:
     - Bisa memilih bahasa pemrograman.
     - Preview menampilkan syntax highlighting (gunakan highlight.js atau Prism.js).
     - Blok kode memiliki latar gelap, font monospace, header penanda bahasa, dan tombol copy.
   - Markdown di-render dengan tipografi nyaman dibaca, otomatis membuat catatan terlihat menarik.

4. **Penyimpanan & Sinkronisasi**
   - Semua data catatan dan folder disimpan di database Lovable (Supabase) sehingga tidak hilang.
   - Tetap ada fitur ekspor:
     - Download seluruh data sebagai file JSON.
     - Download satu catatan sebagai file `.md`.
   - Impor data dari file JSON (menggabungkan atau mengganti data yang ada).
   - Setiap catatan memiliki timestamp `createdAt` dan `updatedAt`.

5. **AI Peringkas & Perapih Catatan**
   - Gunakan AI bawaan Lovable. Di setiap catatan, sediakan dua tombol:
     - "✨ Rapihkan & Perbaiki": AI akan memperbaiki struktur, tata bahasa, menambah penjelasan jika kurang, dan mengubah konten menjadi versi yang lebih rapi (format Markdown baik). Hasil bisa dipratinjau, lalu diterapkan menggantikan teks asli.
     - "📋 Ringkas": AI merangkum catatan menjadi poin-poin kunci dalam bullet list Markdown. Hasil ditampilkan di modal, bisa disalin atau disisipkan.
   - Tampilkan indikator loading saat AI memproses.
   - System prompt AI untuk perbaikan: "Kamu adalah asisten yang merapikan catatan belajar pemrograman. Perbaiki struktur, tata bahasa, tambahkan penjelasan jika kurang, pastikan format Markdown rapi (heading, list, code block). Jangan mengubah makna asli. Output hanya konten yang sudah dirapikan dalam bahasa yang sama."
   - System prompt untuk ringkasan: "Ringkas catatan berikut menjadi poin-poin kunci yang mudah dipahami dan diingat. Gunakan bullet list Markdown. Jangan menambahkan informasi di luar isi catatan."

6. **Pencarian Global**
   - Search bar di atas sidebar untuk mencari kata kunci di semua judul dan isi catatan (lintas folder).
   - Hasil pencarian muncul di dropdown, klik langsung membuka catatan.

7. **UI/UX & Desain**
   - Tampilan modern, bersih, dengan palet warna nyaman (misalnya kombinasi putih/biru/abu) dan dark mode/light mode toggle (preferensi disimpan di localStorage).
   - Animasi transisi halus saat membuka catatan atau berpindah folder.
   - Sidebar kiri dapat di-collapse.
   - Tombol aksi intuitif, konfirmasi sebelum hapus.
   - Shortcut keyboard: `Ctrl+N` buat catatan baru, `Ctrl+S` simpan manual, `Ctrl+F` fokus search.
   - Statistik sederhana (jumlah total catatan dan folder) di bagian bawah sidebar.
   - Fitur pin catatan penting di bagian atas daftar.

8. **Fitur Tambahan (Nice to Have)**
   - Tag/label berwarna pada catatan (opsional).
   - Tampilan “terakhir diedit” di samping judul catatan.
   - Gunakan ikon dari Lucide React atau React Icons untuk semua tombol dan folder.

🛠️ Teknologi yang Harus Digunakan
- React (functional components + hooks)
- Tailwind CSS untuk styling (utamakan utility classes)
- State management dengan React Context + useReducer atau Zustand (pilih yang ringan)
- Editor Markdown: gunakan library siap pakai seperti `@uiw/react-md-editor` atau `react-simplemde-editor` yang sudah memiliki toolbar dan preview, serta dukungan syntax highlighting.
- Syntax highlighting: highlight.js atau Prism.js
- Database: gunakan client Supabase yang sudah disediakan Lovable (buat tabel `folders` dan `notes` di Supabase)
- Drag & drop: bisa pakai library `react-beautiful-dnd` atau native HTML5 drag and drop untuk pemindahan catatan ke folder.
- AI: konsumsi fitur AI internal Lovable (misalnya dengan memanggil action `lovable.ai` atau endpoint chat, tanpa perlu API key eksternal)

📐 Skema Database (Supabase)
Buat dua tabel:
- folders: id (uuid, primary key), name (text), created_at (timestamptz default now()).
- notes: id (uuid, primary key), title (text), content (text), folder_id (uuid, references folders.id on delete cascade), created_at (timestamptz default now()), updated_at (timestamptz default now()).

Tambahkan index pada kolom folder_id dan title.

📱 Responsivitas
- Desktop: sidebar tetap di kiri, editor di kanan.
- Tablet/Mobile: sidebar bisa digeser atau disembunyikan (drawer), editor full-width dengan tab untuk beralih antara tulis dan preview.

🎯 Output yang Diharapkan
Satu halaman penuh (SPA) dengan komponen-komponen yang rapi, kode bersih, dan langsung bisa dijalankan. Pastikan seluruh fitur berfungsi dengan baik, terutama auto-save, AI, dan ekspor/impor. Fokuskan pada pengalaman pengguna yang minim hambatan dan desain yang menarik.

Buatkan aplikasi ini selengkap mungkin.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://smart-notes-desk.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/97d049ab-9fb6-4b24-8f05-547b7fba5bd5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
