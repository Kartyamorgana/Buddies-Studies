import { supabase } from "@/integrations/supabase/client";
import type { Note } from "@/lib/db";

export const TUTORIAL_TAG = "tutorial";

const TUTORIAL_TITLE = "👋 Mulai di sini — Panduan Lengkap StudyNotes";

const TUTORIAL_CONTENT = `> Catatan ini dibuat otomatis untukmu. Baca sekali, lalu hapus atau simpan sebagai pengingat.

## 1. Kenalan dulu

**StudyNotes** punya dua ruang utama:

| Ruang | Untuk apa |
| --- | --- |
| **Catatan** | Menulis, merapikan, dan meringkas materi belajar |
| **STEM & SNBT** | Latihan soal, analisis materi, dan melihat statistik kelemahanmu |

Pindah antar ruang lewat menu di bagian atas panel kiri.

---

## 2. Ruang Catatan

### Folder & catatan
- Tombol **+** membuat catatan baru (\`Ctrl\`/\`Cmd\` + \`N\`).
- Ikon folder membuat folder baru; folder bisa punya sub-folder.
- Klik kanan / menu tiga titik pada catatan untuk **sematkan (pin)**, **pindahkan**, atau **hapus**.
- Semua tulisan tersimpan otomatis. \`Ctrl\`/\`Cmd\` + \`S\` menyimpan langsung.
- \`Ctrl\`/\`Cmd\` + \`F\` melompat ke kolom pencarian.

### Menulis dengan Markdown
\`\`\`markdown
# Judul besar
## Sub judul
- poin daftar
**tebal**, *miring*, \`kode\`
\`\`\`

Rumus matematika didukung:  $E = mc^2$ dan blok:

$$
\\int_0^1 x^2\\,dx = \\frac{1}{3}
$$

Beralih antara **Edit** dan **Preview** lewat tab di atas editor.

### Bantuan AI
- **Rapikan** — memperbaiki struktur & tata bahasa catatan.
- **Ringkas** — membuat ringkasan singkat isi catatan.
- **Impor materi** — tempel materi panjang (atau berkas), lalu AI mengubahnya jadi catatan rapi.

### Belajar aktif
- **Game** — kuis cepat dari isi catatan yang sedang terbuka.
- **Metode belajar** — Feynman, Cornell, spaced repetition, dan timer Pomodoro.

### Simpan & pindahkan
- **Ekspor** semua catatan sebagai satu berkas, atau catatan aktif sebagai Markdown.
- **Impor** berkas hasil ekspor untuk menggabung atau menimpa data.

---

## 3. Ruang STEM & SNBT

### Latihan
1. Pilih kategori: **Penalaran Umum**, **Kuantitatif**, **Matematika**, atau topik **custom**.
2. Pilih tingkat kesulitan (mudah → HOTS) dan mode:
   - **Santai** — tanpa batas waktu, boleh minta petunjuk.
   - **Ujian** — ada hitungan waktu, pembahasan muncul di akhir.
3. Kerjakan soal, buka **petunjuk** bila mentok, lalu baca **pembahasan**.
4. Butuh hitung-hitungan? Buka **papan coret** untuk menulis/menggambar.

### Analisis materi
Tempel materi atau pilih salah satu catatanmu — sistem memecahnya jadi daftar topik dan membuat soal latihan dari situ.

### Rangkuman rumus
Kumpulan rumus penting per topik, siap dibaca sebelum latihan.

### Analitik
Setiap sesi tercatat. Halaman **Analitik** menampilkan akurasi per topik sehingga topik terlemah terlihat jelas — mulailah latihan berikutnya dari yang paling merah.

---

## 4. Akun & privasi

Semua catatan dan hasil latihan terikat pada akunmu dan tidak bisa dilihat orang lain. Tombol keluar ada di kanan atas panel kiri.

---

## 5. Alur yang disarankan untuk hari pertama

1. Buat folder mata pelajaran.
2. Impor satu materi lewat **Impor materi**.
3. Ringkas catatan itu dengan AI.
4. Uji diri lewat **Game**.
5. Lanjut ke **STEM & SNBT → Latihan**, 10 soal.
6. Buka **Analitik** dan catat topik terlemahmu.

Selamat belajar! 🎓
`;

/**
 * Membuat catatan tutorial satu kali untuk setiap pemakai baru.
 * Mengembalikan catatan baru bila dibuat, atau null bila sudah pernah ada.
 */
export async function ensureTutorialNote(): Promise<Note | null> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;

  const flagKey = `studynotes-tutorial-${userId}`;
  try {
    if (localStorage.getItem(flagKey)) return null;
  } catch {
    /* localStorage tidak tersedia — lanjut cek DB */
  }

  const { data: existing, error: existingError } = await supabase
    .from("notes")
    .select("id")
    .contains("tags", [TUTORIAL_TAG])
    .limit(1);
  if (existingError) return null;

  if (existing && existing.length > 0) {
    try {
      localStorage.setItem(flagKey, "1");
    } catch {
      /* ignore */
    }
    return null;
  }

  const { data, error } = await supabase
    .from("notes")
    .insert({
      title: TUTORIAL_TITLE,
      content: TUTORIAL_CONTENT,
      pinned: true,
      tags: [TUTORIAL_TAG],
    })
    .select()
    .single();
  if (error) return null;

  try {
    localStorage.setItem(flagKey, "1");
  } catch {
    /* ignore */
  }
  return data as Note;
}
