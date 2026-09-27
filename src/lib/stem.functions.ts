import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const SUBJECTS = [
  { id: "umum", label: "Penalaran Umum" },
  { id: "kuantitatif", label: "Pengetahuan Kuantitatif" },
  { id: "matematika", label: "Penalaran Matematika" },
  { id: "custom", label: "Mata Pelajaran Lain" },
] as const;

export type SubjectId = (typeof SUBJECTS)[number]["id"];

const SUBJECT_BRIEF: Record<string, string> = {
  umum: "Penalaran Umum SNBT: penalaran induktif/deduktif, penalaran kuantitatif sederhana, analisis pernyataan, silogisme, pola, dan kesimpulan logis dari teks.",
  kuantitatif:
    "Pengetahuan Kuantitatif SNBT: bilangan, aljabar dasar, aritmetika sosial, perbandingan, himpunan, geometri dasar, statistika, dan peluang.",
  matematika:
    "Penalaran Matematika SNBT: soal cerita kontekstual (literasi matematika) yang menuntut pemodelan, penalaran multi-langkah, dan interpretasi data.",
  custom:
    "Mata pelajaran STEM umum (matematika, fisika, kimia, logika) sesuai materi yang diberikan.",
};

const MATH_RULE =
  "ATURAN RUMUS (WAJIB): " +
  "(1) Pembatas math: inline `$...$`, blok `$$...$$`. " +
  "(2) Rumus yang mengandung `\\frac`, `\\sum`, `\\prod`, `\\int`, `\\lim`, `\\sqrt` besar, matriks, atau `\\begin{...}` HARUS ditulis sebagai BLOK `$$...$$` di baris sendiri dengan blank line sebelum & sesudahnya — JANGAN inline. " +
  "(3) Rumus inline `$...$` hanya untuk notasi pendek tanpa pecahan bertingkat (mis. `$x^2$`, `$\\pi r^2$`, `$x \\to \\infty$`, `$a_n$`). " +
  "(4) Jangan pernah menulis perintah LaTeX di luar pembatas math, dan jangan menaruh rumus di dalam code block. " +
  "(5) Setelah blok `$$...$$`, jangan lupa baris kosong sebelum lanjut ke teks berikutnya. " +
  "(6) PENTING: di dalam JSON, semua backslash LaTeX HARUS ditulis ganda (`\\\\frac`, `\\\\sqrt`, `\\\\lim`, dst) karena JSON memerlukan escaping. " +
  "(7) WAJIB: setiap blok `$$...$$` harus dipisahkan dengan BARIS KOSONG sebelum dan sesudahnya. Di dalam blockquote (`> [!NOTE]`), baris kosong ditulis sebagai `>` tanpa teks. " +
  "(8) Untuk jawaban terlipat, GUNAKAN format callout `> [!DETAILS] Jawaban` — JANGAN pakai HTML `<details>`. Contoh:\n> [!DETAILS] Jawaban\n>\n> Isi jawaban dengan $rumus$ di sini.";

const AnalyzeInput = z.object({
  subject: z.enum(["umum", "kuantitatif", "matematika", "custom"]).default("custom"),
  topic: z.string().max(400).optional(),
  filename: z.string().max(300).optional(),
  material: z.string().max(200000).optional(),
  fileBase64: z.string().optional(),
  fileMime: z.string().optional(),
});

const AnalyzeSchema = z.object({
  title: z.string().min(1),
  overview: z.string().default(""),
  concepts: z.string().default(""),
  formulas: z.string().default(""),
  cheatsheet: z
    .array(
      z.object({
        name: z.string(),
        latex: z.string(),
        when: z.string().default(""),
      }),
    )
    .default([]),
  pitfalls: z.string().default(""),
});

export type StemAnalysis = z.infer<typeof AnalyzeSchema>;

/* -------------------------------------------------------------------------- */
/*  JSON repair — tangani backslash LaTeX yang tidak di-escape AI             */
/* -------------------------------------------------------------------------- */

function repairJsonEscapes(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s[i];

    if (c !== "\\") {
      out += c;
      i++;
      continue;
    }

    const next = s[i + 1];

    if (!next) {
      out += c;
      i++;
      continue;
    }

    if (next === "\\" || next === '"' || next === "/") {
      out += c + next;
      i += 2;
      continue;
    }

    if (next === "u" && /^[0-9a-fA-F]{4}$/.test(s.slice(i + 2, i + 6))) {
      out += s.slice(i, i + 6);
      i += 6;
      continue;
    }

    if (/[bfnrt]/.test(next)) {
      const after = s[i + 2];
      const isBareEscape = !after || !/[a-zA-Z]/.test(after);
      if (isBareEscape) {
        out += c + next;
        i += 2;
        continue;
      }
      out += "\\\\" + next;
      i += 2;
      continue;
    }

    out += "\\\\" + next;
    i += 2;
  }
  return out;
}

function fixControlChars(v: unknown): unknown {
  if (typeof v === "string") {
    return v
      .replace(/\t(?=[a-zA-Z])/g, "\\t")
      .replace(/\f/g, "\\f")
      .replace(/\x08/g, "\\b")
      .replace(/\r(?=[a-zA-Z])/g, "\\r")
      .replace(/\n(?=(eq|eg|abla|u\b|otin|i\b|leq|geq|ot\b|ewline))/g, "\\n");
  }
  if (Array.isArray(v)) return v.map(fixControlChars);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fixControlChars(x)]));
  }
  return v;
}

function parseJson<T>(raw: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): T {
  const cleaned = raw.trim();

  const candidates: string[] = [cleaned];
  const braceMatch = cleaned.match(/\{[\s\S]*\}/);
  if (braceMatch && braceMatch[0] !== cleaned) {
    candidates.push(braceMatch[0]);
  }

  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      return schema.parse(fixControlChars(JSON.parse(candidate)));
    } catch (e) {
      lastError = e as Error;
    }
    try {
      return schema.parse(JSON.parse(repairJsonEscapes(candidate)));
    } catch (e) {
      lastError = e as Error;
    }
  }

  throw new Error(`Format hasil AI tidak valid: ${lastError?.message ?? "JSON parse gagal"}`);
}

/* -------------------------------------------------------------------------- */
/*  analyzeStemMaterial                                                       */
/* -------------------------------------------------------------------------- */

export const analyzeStemMaterial = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data }) => {
    const { chat, stripFences } = await import("./ingest.server");

    const system = [
      "Kamu tutor STEM & SNBT yang menjelaskan materi hitungan (matematika, fisika, kimia, logika) dengan bahasa sederhana namun akurat.",
      `Fokus bidang: ${SUBJECT_BRIEF[data.subject]}`,
      'Balas HANYA JSON valid tanpa code fence: {"title":string,"overview":string,"concepts":string,"formulas":string,"cheatsheet":[{"name":string,"latex":string,"when":string}],"pitfalls":string}',
      "- overview: Markdown 3-5 baris berisi inti materi dan kenapa penting untuk SNBT.",
      "- concepts: Markdown lengkap. Untuk setiap konsep gunakan `### <konsep>`, lalu penjelasan bahasa sehari-hari, analogi, langkah berpikir bernomor, dan minimal satu contoh perhitungan lengkap.",
      "- formulas: Markdown khusus rumus. Setiap rumus ditulis sebagai blok `$$...$$` diikuti penjelasan tiap variabel dan syarat pemakaian.",
      "- cheatsheet: daftar rumus kunci; `latex` HANYA isi LaTeX tanpa pembatas $ (contoh: `v = \\\\frac{s}{t}`), `when` = kapan dipakai (maks 1 kalimat).",
      "- pitfalls: Markdown bullet kesalahan umum + cara menghindarinya.",
      MATH_RULE,
      "Gunakan Bahasa Indonesia.",
    ].join("\n");

    const blocks: Parameters<typeof chat>[1] = [];
    if (data.topic?.trim()) {
      blocks.push({ type: "text", text: `Topik yang diminta pengguna: ${data.topic}` });
    }
    if (data.fileBase64) {
      const mime = data.fileMime ?? "application/pdf";
      if (mime.startsWith("image/")) {
        blocks.push({
          type: "image_url",
          image_url: { url: `data:${mime};base64,${data.fileBase64}` },
        });
      } else {
        blocks.push({
          type: "file",
          file: {
            filename: data.filename ?? "materi.pdf",
            file_data: `data:${mime};base64,${data.fileBase64}`,
          },
        });
      }
      blocks.push({ type: "text", text: "Analisis materi pada lampiran di atas." });
    }
    if (data.material?.trim()) {
      blocks.push({ type: "text", text: `=== ISI MATERI ===\n${data.material.slice(0, 200000)}` });
    }
    if (!blocks.length) throw new Error("Tidak ada materi atau topik yang dikirim");

    return parseJson(stripFences(await chat(system, blocks)), AnalyzeSchema);
  });

/* -------------------------------------------------------------------------- */
/*  generateStemQuiz                                                          */
/* -------------------------------------------------------------------------- */

const QuizInput = z.object({
  subject: z.enum(["umum", "kuantitatif", "matematika", "custom"]).default("custom"),
  difficulty: z.enum(["easy", "medium", "hard", "hots"]).default("medium"),
  count: z.number().int().min(3).max(20).default(5),
  topic: z.string().max(400).optional(),
  material: z.string().max(120000).optional(),
});

const QuizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        type: z.enum(["mc", "num"]).default("mc"),
        options: z.array(z.string()).default([]),
        answer: z.string().min(1),
        hints: z.array(z.string()).default([]),
        solution: z.string().default(""),
        topic: z.string().default(""),
      }),
    )
    .min(1),
});

export type StemQuestion = z.infer<typeof QuizSchema>["questions"][number];

const DIFF: Record<string, string> = {
  easy: "Mudah: satu langkah hitung, angka ramah, konteks singkat.",
  medium: "Sedang: 2-3 langkah, sedikit konversi satuan atau pemodelan sederhana.",
  hard: "Sulit: 3-5 langkah, angka menantang, pengecoh berbasis miskonsepsi umum.",
  hots: "HOTS: menuntut analisis, evaluasi, dan sintesis. Soal cerita panjang bergaya UTBK dengan data/tabel, informasi pengecoh, dan pemodelan multi-konsep. Tetap dapat diselesaikan hanya dengan konsep dari materi.",
};

export const generateStemQuiz = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => QuizInput.parse(d))
  .handler(async ({ data }) => {
    const { chat, stripFences } = await import("./ingest.server");

    const system = [
      "Kamu penyusun soal SNBT/UTBK dan olimpiade STEM.",
      `Bidang: ${SUBJECT_BRIEF[data.subject]}`,
      'Balas HANYA JSON valid tanpa code fence: {"questions":[{"question":string,"type":"mc"|"num","options":[string],"answer":string,"hints":[string],"solution":string,"topic":string}]}',
      `Buat tepat ${data.count} soal. Mayoritas berbentuk soal cerita (word problem) bergaya SNBT asli.`,
      DIFF[data.difficulty],
      '- type "mc": 4-5 opsi, "answer" = teks opsi yang benar (harus identik dengan salah satu options).',
      '- type "num": tanpa options, "answer" = angka saja (gunakan titik desimal, tanpa satuan).',
      '- Sertakan minimal 20% soal type "num" bila cocok.',
      '- "hints": 2-4 petunjuk konseptual berurutan, dari paling umum ke paling spesifik, TANPA membocorkan jawaban akhir.',
      '- "solution": pembahasan langkah demi langkah dalam Markdown bernomor, lengkap dengan perhitungan dan kesimpulan `**Jawaban: ...**`.',
      '- "topic": label singkat konsep yang diuji.',
      MATH_RULE,
      "Gunakan Bahasa Indonesia.",
    ].join("\n");

    const blocks: { type: "text"; text: string }[] = [];
    if (data.topic?.trim()) blocks.push({ type: "text", text: `Topik: ${data.topic}` });
    if (data.material?.trim())
      blocks.push({
        type: "text",
        text: `=== MATERI ACUAN (soal harus berakar pada konsep di sini) ===\n${data.material.slice(0, 120000)}`,
      });
    if (!blocks.length) throw new Error("Tidak ada materi atau topik untuk membuat soal");

    const res = parseJson(stripFences(await chat(system, blocks)), QuizSchema);
    const questions = res.questions.filter(
      (q) =>
        q.type === "num" || ((q.options ?? []).length >= 2 && (q.options ?? []).includes(q.answer)),
    );
    if (!questions.length) throw new Error("AI tidak menghasilkan soal yang valid");
    return { questions: questions.slice(0, data.count) };
  });

/* -------------------------------------------------------------------------- */
/*  generateStemConceptNotes — catatan konsep & rumus SANGAT LENGKAP          */
/* -------------------------------------------------------------------------- */

const ConceptNotesInput = z.object({
  subject: z.enum(["umum", "kuantitatif", "matematika", "custom"]).default("custom"),
  topic: z.string().max(400).optional(),
  /** Dinaikkan dari 120k → 300k. Materi lebih besar dari 90k akan di-chunk otomatis. */
  material: z.string().max(300000).optional(),
});

/** Satu rumus. Satu konsep boleh punya banyak rumus. */
const FormulaSchema = z.object({
  /** Nama rumus (mis. "Rumus ABC"). Boleh kosong bila rumus tidak bernama. */
  name: z.string().default(""),
  /** LaTeX TANPA pembatas $ — dirender sebagai blok. */
  latex: z.string().default(""),
  /** Arti setiap variabel + satuan + makna rumus. */
  description: z.string().default(""),
  /** Kapan rumus ini dipakai. */
  when: z.string().default(""),
});

const ExampleSchema = z.object({
  question: z.string().default(""),
  solution: z.string().default(""),
  answer: z.string().default(""),
});

const ConceptSchema = z.object({
  name: z.string().min(1),
  definition: z.string().default(""),
  explanation: z.string().default(""),
  keyPoints: z.array(z.string()).default([]),
  /** MULTI-RUMUS. Konsep boleh punya 0 rumus (mis. definisi/sifat) atau 5+ rumus. */
  formulas: z.array(FormulaSchema).default([]),
  steps: z.array(z.string()).default([]),
  example: ExampleSchema.default({ question: "", solution: "", answer: "" }),
});

const ConceptNotesSchema = z.object({
  title: z.string().min(1),
  overview: z.string().default(""),
  /** Tidak ada cap kecil. Max 80 hanya pengaman teknis. */
  concepts: z.array(ConceptSchema).min(1).max(80),
  pitfalls: z.array(z.string()).default([]),
  quickRefs: z
    .array(z.object({ term: z.string().min(1), meaning: z.string().min(1) }))
    .default([]),
});

export type StemConceptNotesData = z.infer<typeof ConceptNotesSchema>;
export type StemConcept = z.infer<typeof ConceptSchema>;
export type StemConceptFormula = z.infer<typeof FormulaSchema>;

/* ---------------------------- prompt builder ----------------------------- */

function buildConceptNotesSystem(subject: string, partNote?: string): string {
  return [
    "Kamu tutor STEM & SNBT yang menyusun catatan konsep–rumus SUPER LENGKAP, KOMPREHENSIF, dan berbasis contoh soal.",
    "",
    "═══ PRINSIP KELENGKAPAN (PALING PENTING — WAJIB DIPATUHI) ═══",
    "1. KELENGKAPAN DI ATAS SEGALANYA. Jangan ada konsep, definisi, sifat, teorema, notasi, atau rumus yang terlewat.",
    "2. Baca dan proses SELURUH materi dari awal sampai akhir. Jangan melompati bagian manapun.",
    "3. Daftarkan SETIAP konsep yang dibahas — termasuk sub-topik kecil, catatan pinggir, contoh, dan rumus turunan.",
    "4. Untuk setiap konsep, cantumkan SEMUA rumus yang berkaitan di array `formulas`. Satu konsep boleh punya 0, 1, 2, 5, atau lebih rumus.",
    "5. Jika materi menyebut rumus X, Y, dan Z — ketiganya WAJIB muncul, walau terlihat mirip atau merupakan kasus khusus.",
    "6. JANGAN menggabungkan konsep berbeda menjadi satu entri hanya demi keringkasan.",
    "7. DILARANG menulis frasa seperti 'dan rumus terkait lainnya', 'dll', 'sebagainya' — tuliskan semuanya secara eksplisit.",
    "8. Jumlah konsep TIDAK dibatasi. Keluarkan sebanyak yang ada di materi (umumnya 5–40).",
    "9. Konsep tanpa rumus (mis. pengertian, sifat kualitatif) tetap dicantumkan dengan `formulas: []`.",
    "10. Urutkan konsep sesuai urutan kemunculan di materi agar mudah ditelusuri.",
    "",
    `Bidang: ${SUBJECT_BRIEF[subject] ?? SUBJECT_BRIEF.custom}`,
    "",
    "═══ BENTUK OUTPUT ═══",
    "Balas HANYA JSON valid tanpa code fence (tanpa ``` dan tanpa penjelasan tambahan):",
    '{"title":string,"overview":string,"concepts":[{"name":string,"definition":string,"explanation":string,"keyPoints":[string],"formulas":[{"name":string,"latex":string,"description":string,"when":string}],"steps":[string],"example":{"question":string,"solution":string,"answer":string}}],"pitfalls":[string],"quickRefs":[{"term":string,"meaning":string}]}',
    "",
    "═══ ATURAN FIELD ═══",
    "- title: ringkas, maks 80 karakter, jelas topiknya.",
    "- overview: 2-5 kalimat: inti materi, cakupan, dan kenapa penting untuk SNBT. Sebutkan jumlah konsep & rumus yang kamu keluarkan di sini (mis. 'Mencakup 14 konsep dan 22 rumus.').",
    "- concepts[].name: nama konsep (maks 8 kata).",
    "- concepts[].definition: pengertian konsep dalam bahasa sederhana (1-3 kalimat).",
    "- concepts[].explanation: penjelasan mendalam — analogi, makna praktis/fisis, hubungan antar variabel, intuisi di balik konsep. Padat namun lengkap.",
    "- concepts[].keyPoints: 2-6 poin kunci untuk dipahami & diingat (maks 25 kata/poin).",
    "- concepts[].formulas: ARRAY. Setiap elemen:",
    "   * name: nama rumus singkat (mis. 'Rumus ABC', 'Kecepatan rata-rata'). Boleh '' bila tidak bernama.",
    "   * latex: LaTeX TANPA pembatas $ (contoh: `x = \\\\frac{-b \\\\pm \\\\sqrt{b^2-4ac}}{2a}`).",
    "   * description: arti SETIAP variabel + satuannya + makna rumus (bukan menulis ulang rumus).",
    "   * when: 1-2 kalimat kapan rumus dipakai.",
    "- concepts[].steps: langkah memakai rumus/konsep untuk mengerjakan soal, bernomor dan berurut, dari memahami soal sampai menulis jawaban akhir.",
    "- concepts[].example: SATU contoh soal lengkap per konsep.",
    "   * Prioritas: jika materi memuat contoh soal, WAJIB pakai contoh itu (salin apa adanya, jangan ganti).",
    "   * Jika materi tidak punya contoh, buat sendiri yang setara tingkat SNBT.",
    "   * question = teks soal lengkap. solution = pembahasan bernomor langkah demi langkah. answer = jawaban akhir ringkas.",
    "- pitfalls: 4-8 kesalahan umum saat mengerjakan soal dengan konsep ini + cara menghindarinya.",
    "- quickRefs: 6-15 istilah penting beserta arti singkatnya (maks 18 kata/istilah).",
    "",
    "═══ ATURAN MATEMATIKA ═══",
    "Notasi pendek boleh inline `$...$` (mis. `$x^2$`, `$\\\\pi$`, `$v$`).",
    "Rumus berpecahan/panjang TULIS sebagai blok `$$...$$` di baris sendiri dengan blank line sebelum & sesudahnya.",
    "JANGAN menaruh rumus di dalam code block, dan jangan pernah menulis perintah LaTeX (\\\\frac, \\\\sqrt, dst) di luar pembatas math.",
    "PENTING: di dalam JSON, semua backslash LaTeX HARUS ditulis ganda (`\\\\frac`, `\\\\sqrt`, `\\\\lim`, dst).",
    "",
    "Gunakan Bahasa Indonesia.",
    partNote ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ------------------------------ chunker ---------------------------------- */

/** Pecah materi panjang jadi potongan ≤ maxChars, mengutamakan batas heading/paragraf. */
function splitMaterial(material: string, maxChars: number): string[] {
  if (material.length <= maxChars) return [material];
  const lines = material.split("\n");
  const chunks: string[] = [];
  let buf = "";

  const flush = () => {
    if (buf.trim()) chunks.push(buf);
    buf = "";
  };

  for (const line of lines) {
    const isHeading = /^#{1,4}\s/.test(line);
    if (buf.length + line.length + 1 > maxChars && buf) {
      // Kalau baris ini heading dan buf belum terlalu besar, potong dulu.
      if (isHeading || buf.length > maxChars * 0.6) {
        flush();
      }
    }
    // Baris tunggal super panjang → pecah paksa
    if (line.length > maxChars) {
      flush();
      let rest = line;
      while (rest.length > maxChars) {
        chunks.push(rest.slice(0, maxChars));
        rest = rest.slice(maxChars);
      }
      buf = rest;
      continue;
    }
    buf = buf ? `${buf}\n${line}` : line;
    if (buf.length >= maxChars) flush();
  }
  flush();
  return chunks.length ? chunks : [material];
}

/* ------------------------------ merger ----------------------------------- */

function normName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function conceptScore(c: StemConcept): number {
  return (
    c.definition.length +
    c.explanation.length +
    c.keyPoints.join(" ").length +
    c.formulas.reduce((n, f) => n + f.name.length + f.latex.length + f.description.length + f.when.length, 0) +
    c.steps.join(" ").length +
    c.example.question.length +
    c.example.solution.length +
    c.example.answer.length
  );
}

function unionFormulas(a: StemConceptFormula[], b: StemConceptFormula[]): StemConceptFormula[] {
  const seen = new Set<string>();
  const out: StemConceptFormula[] = [];
  for (const f of [...a, ...b]) {
    const key = (f.latex || f.name).trim().toLowerCase().replace(/\s+/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

function mergeConceptNotes(results: StemConceptNotesData[]): StemConceptNotesData {
  const first = results[0]!;
  const conceptMap = new Map<string, StemConcept>();

  for (const r of results) {
    for (const c of r.concepts) {
      const key = normName(c.name);
      if (!key) continue;
      const existing = conceptMap.get(key);
      if (!existing) {
        conceptMap.set(key, c);
        continue;
      }
      const richer = conceptScore(c) > conceptScore(existing) ? c : existing;
      const leaner = richer === c ? existing : c;
      conceptMap.set(key, {
        ...richer,
        formulas: unionFormulas(richer.formulas, leaner.formulas),
        // gabung keyPoints unik
        keyPoints: Array.from(
          new Set([...richer.keyPoints, ...leaner.keyPoints].map((k) => k.trim()).filter(Boolean)),
        ),
      });
    }
  }

  const pitfallSeen = new Set<string>();
  const pitfalls: string[] = [];
  for (const r of results) {
    for (const p of r.pitfalls) {
      const k = p.trim().toLowerCase();
      if (!k || pitfallSeen.has(k)) continue;
      pitfallSeen.add(k);
      pitfalls.push(p);
    }
  }

  const qrSeen = new Set<string>();
  const quickRefs: { term: string; meaning: string }[] = [];
  for (const r of results) {
    for (const q of r.quickRefs) {
      const k = q.term.trim().toLowerCase();
      if (!k || qrSeen.has(k)) continue;
      qrSeen.add(k);
      quickRefs.push(q);
    }
  }

  return {
    title: first.title,
    overview: first.overview,
    concepts: Array.from(conceptMap.values()),
    pitfalls,
    quickRefs,
  };
}

/* ------------------------------ server fn -------------------------------- */

/** Ambang batas materi per pemanggilan AI. Materi > ini akan dipecah. */
const MATERIAL_CHUNK_CHARS = 90_000;

export const generateStemConceptNotes = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ConceptNotesInput.parse(d))
  .handler(async ({ data }) => {
    const { chat, stripFences } = await import("./ingest.server");

    const topic = data.topic?.trim();
    const material = data.material?.trim() ?? "";

    if (!topic && !material) {
      throw new Error("Tidak ada topik atau materi untuk membuat catatan konsep");
    }

    const buildBlocks = (materialPart?: string) => {
      const blocks: { type: "text"; text: string }[] = [];
      if (topic) blocks.push({ type: "text", text: `Topik: ${topic}` });
      if (materialPart?.trim()) {
        blocks.push({ type: "text", text: `=== MATERI ACUAN ===\n${materialPart}` });
      }
      return blocks;
    };

    // ---- Materi kecil: satu panggilan ----
    if (material.length <= MATERIAL_CHUNK_CHARS) {
      const sys = buildConceptNotesSystem(data.subject);
      const raw = stripFences(await chat(sys, buildBlocks(material || undefined)));
      return parseJson(raw, ConceptNotesSchema);
    }

    // ---- Materi besar: chunk + merge ----
    const chunks = splitMaterial(material, MATERIAL_CHUNK_CHARS);
    const results: StemConceptNotesData[] = [];
    const errors: string[] = [];

    // Proses 2 chunk sekaligus agar tidak kena rate limit.
    for (let i = 0; i < chunks.length; i += 2) {
      const batch = chunks.slice(i, i + 2);
      const settled = await Promise.allSettled(
        batch.map((part, j) => {
          const idx = i + j;
          const sys = buildConceptNotesSystem(
            data.subject,
            `CATATAN PENTING: Ini BAGIAN ${idx + 1} dari ${chunks.length} materi. ` +
              `Proses HANYA bagian ini. ` +
              `Keluarkan SEMUA konsep & rumus yang muncul di bagian ini tanpa terkecuali, ` +
              `walau kamu merasa sudah pernah menyebutkannya. ` +
              `Jangan mengarang konsep dari bagian lain yang tidak ada di teks ini.`,
          );
          return chat(sys, buildBlocks(part)).then((raw) =>
            parseJson(stripFences(raw), ConceptNotesSchema),
          );
        }),
      );
      for (const s of settled) {
        if (s.status === "fulfilled") results.push(s.value);
        else errors.push((s.reason as Error)?.message ?? "gagal");
      }
    }

    if (!results.length) {
      throw new Error(
        `Semua bagian materi gagal diproses${errors[0] ? `: ${errors[0]}` : ""}`,
      );
    }

    const merged = mergeConceptNotes(results);
    // Sisipkan info jumlah bagian ke overview agar user tahu materi di-chunk.
    const partsNote = `_(Materi diproses dalam ${results.length}/${chunks.length} bagian — ${
      errors.length ? `${errors.length} bagian gagal, ` : ""
    }digabung otomatis.)_`;
    merged.overview = merged.overview ? `${merged.overview}\n\n${partsNote}` : partsNote;
    return merged;
  });

/* -------------------------------------------------------------------------- */
/*  Serializer → Markdown (dipakai untuk save-note & copy)                    */
/* -------------------------------------------------------------------------- */

export function conceptNotesToMarkdown(cs: StemConceptNotesData): string {
  const lines: string[] = [`# ${cs.title}`, ""];
  if (cs.overview) lines.push(cs.overview, "");

  cs.concepts.forEach((c, i) => {
    lines.push(`## ${i + 1}. ${c.name}`, "");
    if (c.definition) lines.push(`**Pengertian:** ${c.definition}`, "");
    if (c.explanation) lines.push(c.explanation, "");

    if (c.keyPoints.length) {
      lines.push("**Poin penting:**");
      for (const k of c.keyPoints) lines.push(`- ${k}`);
      lines.push("");
    }

    if (c.formulas.length) {
      lines.push("**Rumus:**", "");
      c.formulas.forEach((f, fi) => {
        const label = f.name ? `**${fi + 1}. ${f.name}**` : `**Rumus ${fi + 1}**`;
        lines.push(label, "");
        if (f.latex) lines.push(`$$${f.latex}$$`, "");
        if (f.description) lines.push(f.description, "");
        if (f.when) lines.push(`> **Kapan dipakai:** ${f.when}`, "");
      });
    }

    if (c.steps.length) {
      lines.push("**Langkah penggunaan:**");
      c.steps.forEach((s, j) => lines.push(`${j + 1}. ${s}`));
      lines.push("");
    }

    if (c.example?.question) {
      lines.push("**Contoh soal:**", "", `> ${c.example.question}`, "");
      if (c.example.solution) lines.push(c.example.solution, "");
      if (c.example.answer) lines.push("", `**Jawaban:** ${c.example.answer}`, "");
    }

    lines.push("");
  });

  if (cs.pitfalls.length) {
    lines.push("## ⚠️ Kesalahan umum", "");
    for (const p of cs.pitfalls) lines.push(`- ${p}`);
    lines.push("");
  }

  if (cs.quickRefs.length) {
    lines.push("## 📖 Glosarium", "");
    for (const q of cs.quickRefs) lines.push(`- **${q.term}** — ${q.meaning}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}