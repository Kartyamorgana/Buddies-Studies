# StudyNotes

Aplikasi web catatan belajar interaktif dengan latihan STEM, ringkasan AI, dan rencana belajar pribadi. Dibangun untuk persiapan UTBK SNBT dan pembelajaran mandiri.

> **Status:** Production · Mandiri (tidak terikat platform apapun)

---

## ✨ Fitur Utama

### 📝 Manajemen Catatan
- Buat, edit, hapus catatan dengan format Markdown
- Folder tree expandable untuk mengorganisasi catatan
- Auto-save dengan debounce ke database
- Pin catatan penting, tag berwarna, pencarian global
- Ekspor/impor JSON, download catatan sebagai `.md`

### ✨ AI Peringkas & Perapih
- **Rapihkan & Perbaiki** — AI memperbaiki struktur, tata bahasa, dan format Markdown
- **Ringkas** — ringkasan poin-poin kunci dalam bullet list
- Mendukung catatan panjang via chunking otomatis

### 🧪 STEM & SNBT Studio
- **Analisis Materi** — upload PDF/gambar/teks → analisis konsep + rumus + cheat sheet
- **Catatan Konsep & Rumus** — ekstraksi lengkap konsep & rumus dari materi (multi-rumus per konsep)
- **Latihan** — generate soal pilihan ganda & isian bergaya UTBK dengan pembahasan
- **Prediksi Skor** — estimasi skor UTBK skala 200–1000 (pendekatan IRT sederhana)
- **Rencana Belajar Adaptif** — AI menyusun rencana harian berdasarkan kelemahan

### 🎧 VARK Learning Modes
- **Auditory Studio** — naskah podcast dari materi
- **Kinesthetic Lab** — teka-teki logika & latihan interaktif
- **Lecture Transcriber** — rekam/upload audio → transkrip → catatan/soal/podcast

### 🎨 UI/UX
- Modern, responsif, dark/light mode
- Editor split view dengan syntax highlighting (highlight.js)
- Rendering LaTeX (KaTeX) untuk rumus matematika
- Pomodoro timer, floating timer, header actions

---

## 🛠️ Teknologi

| Layer | Teknologi |
|---|---|
| **Framework** | React 19 + TanStack Start + TanStack Router + TanStack Query |
| **Styling** | Tailwind CSS v4 + shadcn/ui (Radix UI) |
| **Database** | Supabase (PostgreSQL + Row Level Security) |
| **Auth** | Supabase Auth — Google OAuth + Email/Password |
| **AI** | Google AI Studio (Gemini 2.5 Flash, OpenAI-compatible endpoint) |
| **Markdown** | react-markdown + remark-gfm + remark-math + rehype-katex + rehype-highlight |
| **PDF** | pdfjs-dist (client-side extraction + image fallback) |
| **Office** | JSZip (parse PPTX/DOCX/XLSX di browser) |
| **Deploy** | Cloudflare Workers (via Nitro) |
| **Build** | Vite 7 + TypeScript 5.8 |

---

## 🚀 Setup Lokal

### Prasyarat
- Node.js ≥ 20
- npm ≥ 10
- Akun Supabase (gratis)
- Akun Google AI Studio (gratis)

### 1. Clone & Install

```bash
git clone https://github.com/Kartyamorgana/studynotes.git
cd studynotes
npm install