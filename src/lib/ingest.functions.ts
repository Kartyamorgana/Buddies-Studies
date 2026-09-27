import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TranscribeInput = z.object({
  base64: z.string().min(1),
  mime: z.string().min(1),
  filename: z.string().min(1),
});

const MaterialInput = z.object({
  filename: z.string().min(1),
  material: z.string().max(200000).optional(),
  /** Halaman PDF tanpa teks yang sudah dirender jadi gambar (data URL JPEG). */
  images: z.array(z.string()).max(40).default([]),
  pdfBase64: z.string().optional(),
  pdfMime: z.string().optional(),
  existingContent: z.string().max(60000).optional(),
  depth: z.enum(["standard", "deep", "wide", "ultra", "mega"]).default("standard"),
});

const OutlineInput = z.object({
  filename: z.string().min(1),
  material: z.string().max(200000).optional(),
  images: z.array(z.string()).max(40).default([]),
  pdfBase64: z.string().optional(),
  pdfMime: z.string().optional(),
  existingContent: z.string().max(60000).optional(),
  sectionCount: z.number().int().min(3).max(40).default(12),
});

const ExpandInput = z.object({
  title: z.string().min(1),
  digest: z.string().max(120000),
  heading: z.string().min(1),
  points: z.array(z.string()).default([]),
  outlineHeadings: z.array(z.string()).default([]),
  pages: z.string().default(""),
  targetWords: z.number().int().min(300).max(4000).default(1200),
  index: z.number().int().min(0).default(0),
  total: z.number().int().min(1).default(1),
});

const GameInput = z.object({
  content: z.string().min(20).max(1000000),
  type: z.enum(["quiz", "flashcards", "matching", "blanks", "all"]).default("all"),
  count: z.number().int().min(4).max(40).default(10),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});

/** Pecah catatan panjang jadi beberapa bagian seimbang berdasarkan heading. */
function chunkNote(content: string, maxChunks: number, maxChars: number) {
  const lines = content.split("\n");
  const blocks: string[] = [];
  let cur: string[] = [];
  for (const line of lines) {
    if (/^#{1,3}\s/.test(line) && cur.join("\n").trim().length > 400) {
      blocks.push(cur.join("\n"));
      cur = [];
    }
    cur.push(line);
  }
  if (cur.length) blocks.push(cur.join("\n"));

  const chunks: string[] = [];
  let buf = "";
  for (const b of blocks) {
    const piece = b.length > maxChars ? b.slice(0, maxChars) : b;
    if (buf && buf.length + piece.length > maxChars) {
      chunks.push(buf);
      buf = piece;
    } else {
      buf = buf ? `${buf}\n${piece}` : piece;
    }
  }
  if (buf.trim()) chunks.push(buf);

  if (chunks.length <= maxChunks) return chunks;
  // ambil secara merata agar seluruh catatan terwakili
  const step = chunks.length / maxChunks;
  return Array.from({ length: maxChunks }, (_, i) => chunks[Math.floor(i * step)]!);
}


export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TranscribeInput.parse(d))
  .handler(async ({ data }) => {
    const { transcribe } = await import("./ingest.server");
    return { text: await transcribe(data.base64, data.mime, data.filename) };
  });

export const generateNoteFromMaterial = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => MaterialInput.parse(d))
  .handler(async ({ data }) => {
    const { chat, stripFences } = await import("./ingest.server");

    const system = [
      "Kamu adalah tutor ahli yang mengubah materi belajar (slide PPT, transkrip audio/video, PDF, dokumen) menjadi catatan belajar Markdown yang LENGKAP dan mandiri.",
      "Materi sumber biasanya hanya garis besar / poin singkat. Tugasmu MELENGKAPI: jelaskan setiap poin secara utuh, tambahkan definisi, konteks, cara kerja, contoh nyata, contoh kode bila topiknya teknis, analogi sederhana, kesalahan umum, dan rangkuman.",
      "Aturan output:",
      "- Baris pertama: `# <Judul catatan>` (judul deskriptif, bukan nama file).",
      "- Struktur: `## 🧭 Ringkasan Singkat`, `## 🧠 Konsep Inti` (subbagian per topik dengan penjelasan paragraf + bullet), `## 🛠️ Contoh & Penerapan`, `## 📖 Istilah Penting` (tabel istilah–penjelasan), `## ⚠️ Kesalahan Umum`, `## 🎯 Poin Kunci untuk Diingat`, `## ❓ Pertanyaan Refleksi`.",
      "- Setiap topik dari materi WAJIB muncul; jangan ada poin sumber yang hilang.",
      "- Tandai informasi tambahan yang kamu simpulkan sendiri (bukan dari materi) dengan awalan `_(pelengkap)_` supaya pengguna tahu.",
      "Agar catatan menarik dan tidak membosankan (WAJIB):",
      "- Awali catatan dengan blok `> [!TIP]` berisi TL;DR 2-3 baris dan estimasi waktu baca.",
      "- Selipkan callout GitHub-style secara berkala: `> [!NOTE]` (info penting), `> [!TIP]` (trik menghafal/analogi), `> [!WARNING]` (kesalahan umum), `> [!IMPORTANT]` (harus diingat).",
      "- Gunakan emoji pada heading dan variasi format: tabel perbandingan, checklist `- [ ]`, diagram alur ASCII/mermaid sederhana dalam code block, dan bullet berlapis maksimal 2 tingkat.",
      "- Setiap subbagian besar diakhiri baris `**💡 Cara mengingat:**` satu kalimat.",
      "- Akhiri catatan dengan `## ✅ Cek Pemahaman` berisi 5 pertanyaan singkat plus jawaban dalam `<details><summary>Jawaban</summary> ... </details>`.",
      "- Paragraf pendek (maksimal 3-4 baris), gunakan **bold** untuk istilah kunci agar mudah dipindai.",
      "- Gunakan bahasa yang sama dengan materi (default Bahasa Indonesia). Gunakan code block berlabel bahasa untuk kode.",
      "- RUMUS (WAJIB): setiap notasi matematika/kimia harus dibungkus pembatas math — inline `$...$` dan blok `$$...$$`. Jangan pernah menulis perintah LaTeX seperti \\frac, \\sqrt, \\sum, x_1, ^2 di luar pembatas math, dan jangan taruh rumus di dalam code block.",
      "- RUJUKAN HALAMAN (WAJIB bila materi memuat penanda seperti `--- Halaman 3 ---`, `--- Slide 5 ---`, atau `--- Sheet ... ---`): setiap subbagian diawali penanda sumber miring, misalnya `_(sumber: hlm. 3-5)_`, dan fakta penting diberi rujukan `(hlm. 7)` di akhir kalimat. Jangan mengarang nomor halaman; bila materi tidak punya penanda, lewati aturan ini.",
      "- Keluarkan HANYA Markdown, tanpa penjelasan tambahan dan tanpa membungkusnya dalam code fence.",

      data.depth === "standard"
        ? "- Buat catatan padat namun lengkap, sekitar 800-1200 kata."
        : "- Buat catatan sangat mendalam (setara bab buku), minimal 2000 kata.",
      data.existingContent
        ? "Pengguna sudah punya catatan lama (diberikan di bawah). Gabungkan: pertahankan isi yang benar, perbaiki yang salah, dan lengkapi yang kurang menjadi satu catatan utuh."
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const blocks: Parameters<typeof chat>[1] = [];
    blocks.push({ type: "text", text: `Nama file materi: ${data.filename}` });
    if (data.existingContent?.trim()) {
      blocks.push({
        type: "text",
        text: `=== CATATAN LAMA PENGGUNA ===\n${data.existingContent}`,
      });
    }
    if (data.pdfBase64) {
      blocks.push({
        type: "file",
        file: {
          filename: data.filename,
          file_data: `data:${data.pdfMime ?? "application/pdf"};base64,${data.pdfBase64}`,
        },
      });
      blocks.push({ type: "text", text: "Buat catatan lengkap dari dokumen di atas." });
    } else {
      if (data.material?.trim()) {
        blocks.push({
          type: "text",
          text: `=== ISI MATERI ===\n${data.material.slice(0, 200000)}`,
        });
      }
      if (data.images.length) {
        blocks.push({
          type: "text",
          text: `=== HALAMAN GAMBAR (${data.images.length} halaman) ===\nHalaman berikut adalah gambar slide/scan. Baca seluruh teks, rumus, tabel, dan diagram di dalamnya.`,
        });
        for (const url of data.images) {
          blocks.push({ type: "image_url", image_url: { url } });
        }
      }
    }

    const text = stripFences(await chat(system, blocks));
    const firstLine = text.split("\n")[0] ?? "";
    const title = firstLine.startsWith("# ")
      ? firstLine.slice(2).trim()
      : data.filename.replace(/\.[^.]+$/, "");
    const content = firstLine.startsWith("# ")
      ? text.split("\n").slice(1).join("\n").trim()
      : text;
    return { title: title.slice(0, 120), content };
  });

const GameSchema = z.object({
  quiz: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).min(2),
        answer: z.number().int().min(0),
        explanation: z.string().default(""),
      }),
    )
    .default([]),
  flashcards: z.array(z.object({ front: z.string(), back: z.string() })).default([]),
  matching: z.array(z.object({ term: z.string(), definition: z.string() })).default([]),
  blanks: z
    .array(z.object({ sentence: z.string(), answer: z.string(), hint: z.string().default("") }))
    .default([]),
});

const DIFF_TEXT = {
  easy: "Tingkat mudah: uji ingatan definisi dan fakta dasar, kalimat singkat dan jelas.",
  medium: "Tingkat sedang: campur ingatan dan pemahaman, pengecoh mirip tapi jelas salah.",
  hard: "Tingkat sulit: uji penerapan, analisis, dan pembedaan konsep yang mirip; pengecoh sangat menantang.",
} as const;

export const generateStudyGame = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GameInput.parse(d))
  .handler(async ({ data }) => {
    const { chat, stripFences } = await import("./ingest.server");

    const CHUNK_CHARS = 22000;
    type GameKind = "quiz" | "flashcards" | "matching" | "blanks";
    const wanted: GameKind[] =
      data.type === "all" ? ["quiz", "flashcards", "matching"] : [data.type];
    // makin banyak soal diminta -> makin banyak potongan catatan dipakai
    const maxChunks = Math.min(6, Math.max(1, Math.ceil(data.count / 6)));
    const chunks = chunkNote(data.content, maxChunks, CHUNK_CHARS);
    const per = (n: number) => Math.max(2, Math.ceil(n / chunks.length));

    const shapeFor = () => {
      const parts: string[] = [];
      if (wanted.includes("quiz"))
        parts.push('"quiz":[{"question":string,"options":[string,string,string,string],"answer":0,"explanation":string}]');
      if (wanted.includes("flashcards")) parts.push('"flashcards":[{"front":string,"back":string}]');
      if (wanted.includes("matching")) parts.push('"matching":[{"term":string,"definition":string}]');
      if (wanted.includes("blanks"))
        parts.push('"blanks":[{"sentence":string dengan bagian rumpang ditulis ___,"answer":string,"hint":string}]');
      return `{${parts.join(",")}}`;
    };

    const tasks: string[] = [];
    if (wanted.includes("quiz"))
      tasks.push(`${per(data.count)} soal quiz pilihan ganda (4 opsi, indeks jawaban 0-3, sertakan penjelasan singkat)`);
    if (wanted.includes("flashcards"))
      tasks.push(`${per(data.type === "all" ? Math.round(data.count * 1.2) : data.count)} flashcard (depan: pertanyaan/istilah, belakang: jawaban ringkas)`);
    if (wanted.includes("matching"))
      tasks.push(`${per(data.type === "all" ? Math.max(6, Math.round(data.count * 0.6)) : data.count)} pasangan istilah–definisi singkat`);
    if (wanted.includes("blanks"))
      tasks.push(`${per(data.count)} kalimat isi rumpang (satu jawaban per kalimat, tulis bagian kosong sebagai ___, beri hint singkat)`);

    const system = [
      "Kamu membuat materi latihan interaktif dari sebuah catatan belajar.",
      "Balas HANYA JSON valid (tanpa code fence) dengan bentuk:",
      shapeFor(),
      `Buat ${tasks.join(", ")}.`,
      DIFF_TEXT[data.difficulty],
      chunks.length > 1
        ? "Potongan catatan ini adalah bagian dari catatan yang jauh lebih panjang. Buat latihan HANYA dari potongan yang diberikan."
        : "",
      "Semua isi harus bersumber dari catatan. Gunakan bahasa yang sama dengan catatan.",
    ]
      .filter(Boolean)
      .join("\n");

    const { parseLooseJson } = await import("./ingest.server");
    const parse = (raw: string) => GameSchema.parse(parseLooseJson(raw));

    const results: z.infer<typeof GameSchema>[] = [];
    const errors: string[] = [];
    // jalankan 2 potongan sekaligus supaya tidak kena rate limit
    for (let i = 0; i < chunks.length; i += 2) {
      const batch = chunks.slice(i, i + 2);
      const settled = await Promise.allSettled(
        batch.map(async (c) => parse(stripFences(await chat(system, [{ type: "text", text: c }])))),
      );
      for (const s of settled) {
        if (s.status === "fulfilled") results.push(s.value);
        else errors.push((s.reason as Error)?.message ?? "gagal");
      }
    }

    if (!results.length) throw new Error(errors[0] ?? "Gagal membuat latihan");

    const dedupe = <T,>(arr: T[], keyOf: (v: T) => string) => {
      const seen = new Set<string>();
      return arr.filter((v) => {
        const k = keyOf(v).trim().toLowerCase();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    };

    const limit = data.type === "all" ? data.count : data.count;
    const merged = {
      quiz: dedupe(
        results.flatMap((r) => r.quiz).filter((q) => q.answer < q.options.length),
        (q) => q.question,
      ).slice(0, limit),
      flashcards: dedupe(
        results.flatMap((r) => r.flashcards),
        (c) => c.front,
      ).slice(0, data.type === "all" ? Math.round(data.count * 1.2) : limit),
      matching: dedupe(
        results.flatMap((r) => r.matching),
        (p) => p.term,
      ).slice(0, data.type === "all" ? Math.max(6, Math.round(data.count * 0.6)) : Math.min(limit, 14)),
      blanks: dedupe(
        results.flatMap((r) => r.blanks).filter((b) => b.sentence.includes("_")),
        (b) => b.sentence,
      ).slice(0, limit),
    };

    const totalItems =
      merged.quiz.length + merged.flashcards.length + merged.matching.length + merged.blanks.length;
    if (!totalItems) throw new Error("AI tidak menghasilkan latihan yang valid");
    return { ...merged, parts: chunks.length, failedParts: errors.length };
  });




/** Tahap 1 dari catatan super panjang: rangka bab + ringkasan materi (digest). */
export const planNoteOutline = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => OutlineInput.parse(d))
  .handler(async ({ data }) => {
    const { chat, stripFences } = await import("./ingest.server");
    const system = [
      "Kamu perancang buku belajar. Dari materi mentah (slide, transkrip, dokumen) kamu menyusun RANGKA buku catatan yang sangat lengkap.",
      `Balas HANYA JSON valid tanpa code fence: {"title":string,"digest":string,"sections":[{"heading":string,"points":[string]}]}`,
      `- "title": judul buku catatan yang deskriptif (bukan nama file).`,
      `- "digest": ringkasan padat SEMUA isi materi (1200-2000 kata) berisi seluruh fakta, angka, istilah, contoh, dan urutan penjelasan penting. Ini akan dipakai sebagai satu-satunya sumber pada tahap penulisan berikutnya, jadi jangan ada informasi penting yang hilang.`,
      `- "sections": tepat ${data.sectionCount} bagian berurutan yang menutup seluruh materi tanpa tumpang tindih. Setiap bagian punya 4-8 "points" berisi subtopik yang harus dibahas (boleh subtopik pelengkap yang belum ada di materi tapi wajib dipahami).`,
      `- Pertahankan penanda halaman/slide dari materi di dalam "digest" (contoh: [hlm. 4]) agar bisa dikutip saat penulisan.`,
      `- Setiap bagian boleh punya "pages": string ringkas rentang halaman/slide sumbernya (contoh: "3-7"). Kosongkan bila materi tidak memuat penanda halaman.`,
      "PENTING: keluarkan JSON yang utuh dan valid. Escape tanda kutip dan baris baru di dalam string. Jangan berhenti di tengah JSON.",
      "Gunakan bahasa yang sama dengan materi (default Bahasa Indonesia).",
    ].join("\n");

    const blocks: Parameters<typeof chat>[1] = [
      { type: "text", text: `Nama file materi: ${data.filename}` },
    ];
    if (data.existingContent?.trim()) {
      blocks.push({ type: "text", text: `=== CATATAN LAMA PENGGUNA ===\n${data.existingContent}` });
    }
    if (data.pdfBase64) {
      blocks.push({
        type: "file",
        file: {
          filename: data.filename,
          file_data: `data:${data.pdfMime ?? "application/pdf"};base64,${data.pdfBase64}`,
        },
      });
      blocks.push({ type: "text", text: "Susun rangka dan digest dari dokumen di atas." });
    } else {
      if (data.material?.trim()) {
        blocks.push({
          type: "text",
          text: `=== ISI MATERI ===\n${data.material.slice(0, 200000)}`,
        });
      }
      if (data.images.length) {
        blocks.push({
          type: "text",
          text: `=== HALAMAN GAMBAR (${data.images.length} halaman) ===\nHalaman berikut adalah gambar slide/scan. Baca seluruh teks, rumus, tabel, dan diagram di dalamnya.`,
        });
        for (const url of data.images) {
          blocks.push({ type: "image_url", image_url: { url } });
        }
      }
    }

    const raw = stripFences(await chat(system, blocks));
    const Parsed = z.object({
      title: z.string().min(1),
      digest: z.string().default(""),
      sections: z
        .array(
          z.object({
            heading: z.string().min(1),
            points: z.array(z.string()).default([]),
            pages: z.string().default(""),
          }),
        )
        .min(1),
    });
    const { parseLooseJson } = await import("./ingest.server");
    return Parsed.parse(parseLooseJson(raw));
  });

/** Tahap 2: tulis satu bagian panjang berdasarkan rangka + digest. */
export const expandNoteSection = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ExpandInput.parse(d))
  .handler(async ({ data }) => {
    const { chat, stripFences } = await import("./ingest.server");
    const system = [
      "Kamu penulis buku ajar. Tulis SATU bagian catatan belajar yang sangat mendalam dalam Markdown.",
      `Judul buku: "${data.title}". Ini bagian ${data.index + 1} dari ${data.total}.`,
      `Panjang target: ${data.targetWords}-${Math.round(data.targetWords * 1.4)} kata. Jangan lebih pendek dari target.`,
      "Aturan:",
      `- Mulai dengan heading \`## ${data.heading}\`, lalu gunakan \`###\` untuk setiap subtopik.`,
      "- Setiap subtopik: definisi, penjelasan bertahap (paragraf utuh, bukan hanya bullet), cara kerja/alur, minimal satu contoh konkret, analogi sederhana, kesalahan umum, dan tips mengingat.",
      "- Sertakan tabel Markdown bila membandingkan hal, dan code block berlabel bahasa bila topiknya teknis.",
      "Agar tidak membosankan (WAJIB): pakai emoji pada heading bagian, callout GitHub-style `> [!NOTE]` / `> [!TIP]` / `> [!WARNING]` / `> [!IMPORTANT]` secara berkala, paragraf pendek 3-4 baris, **bold** untuk istilah kunci, checklist `- [ ]` untuk langkah, dan satu diagram alur sederhana (ASCII/mermaid dalam code block) bila relevan.",
      "- Setiap subtopik diakhiri baris `**💡 Cara mengingat:**` satu kalimat, dan tambahkan `<details><summary>Uji diri: <pertanyaan></summary> jawaban </details>` satu kali per subtopik.",
      "- Akhiri bagian dengan `> [!IMPORTANT]` berisi 3-5 bullet ringkasan inti bagian ini.",
      data.pages
        ? `- Bagian ini bersumber dari halaman/slide ${data.pages}. Tulis \`_(sumber: hlm. ${data.pages})_\` tepat di bawah heading bagian, dan beri rujukan \`(hlm. N)\` pada fakta penting bila nomor halamannya diketahui dari ringkasan materi.`
        : "- Bila ringkasan materi memuat penanda halaman seperti [hlm. 4], sertakan rujukan `(hlm. 4)` pada fakta penting.",
      "- Informasi pelengkap di luar materi tandai `_(pelengkap)_`.",

      "- JANGAN menulis ulang isi bagian lain (daftar bagian diberikan agar kamu tidak tumpang tindih).",
      "- Keluarkan HANYA Markdown bagian ini, tanpa pembuka/penutup meta dan tanpa code fence pembungkus.",
      "- RUMUS (WAJIB): bungkus semua notasi matematika/kimia dengan `$...$` (inline) atau `$$...$$` (blok). Jangan menulis \\frac, \\sqrt, \\sum, subskrip/superskrip di luar pembatas math, dan jangan menaruh rumus di code block.",
      "Gunakan bahasa yang sama dengan materi (default Bahasa Indonesia).",
    ].join("\n");

    const text = stripFences(
      await chat(system, [
        { type: "text", text: `=== DAFTAR SEMUA BAGIAN ===\n${data.outlineHeadings.join("\n")}` },
        {
          type: "text",
          text: `=== SUBTOPIK YANG HARUS DIBAHAS DI BAGIAN INI ===\n${data.points.join("\n")}`,
        },
        { type: "text", text: `=== RINGKASAN MATERI SUMBER ===\n${data.digest}` },
      ]),
    );
    return { markdown: text.trim() };
  });
