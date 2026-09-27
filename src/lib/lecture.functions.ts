import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const NoteInput = z.object({
  transcript: z.string().min(30).max(200000),
  title: z.string().max(200).default(""),
});

const QuizInput = z.object({
  transcript: z.string().min(30).max(120000),
  count: z.number().int().min(3).max(15).default(6),
});

/** Ubah transkrip kuliah menjadi catatan Markdown yang rapi. */
export const transcriptToNote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => NoteInput.parse(d))
  .handler(async ({ data }) => {
    const { chat, stripFences } = await import("./ingest.server");
    const system = [
      "Kamu mengubah transkrip kuliah/penjelasan guru menjadi catatan belajar Markdown yang rapi dan lengkap.",
      "Baris pertama: `# <Judul catatan>` yang deskriptif.",
      "Struktur: ringkasan singkat, konsep inti per subbagian, contoh, istilah penting, poin kunci, dan pertanyaan refleksi.",
      "Rapikan bahasa lisan menjadi tulisan yang jelas, tapi jangan menambah fakta yang tidak ada di transkrip kecuali ditandai `_(pelengkap)_`.",
      "Bungkus semua notasi matematika dengan `$...$` atau `$$...$$`.",
      "Keluarkan HANYA Markdown tanpa code fence pembungkus.",
    ].join("\n");

    const text = stripFences(
      await chat(system, [
        { type: "text", text: data.title ? `Judul rekaman: ${data.title}` : "" },
        { type: "text", text: `=== TRANSKRIP ===\n${data.transcript}` },
      ]),
    );
    const first = text.split("\n")[0] ?? "";
    return {
      title: first.startsWith("# ") ? first.slice(2).trim().slice(0, 120) : data.title || "Catatan Kuliah",
      content: first.startsWith("# ") ? text.split("\n").slice(1).join("\n").trim() : text,
    };
  });

const QuizSchema = z.object({
  topic: z.string().default(""),
  questions: z
    .array(
      z.object({
        question_text: z.string().min(1),
        options: z.array(z.string()).min(2),
        correct_answer: z.string().min(1),
        hints: z.array(z.string()).default([]),
        solution: z.string().default(""),
        topic: z.string().default(""),
      }),
    )
    .min(1),
});

/** Ubah transkrip menjadi soal latihan pilihan ganda. */
export const transcriptToQuiz = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => QuizInput.parse(d))
  .handler(async ({ data }) => {
    const { chat, stripFences } = await import("./ingest.server");
    const system = [
      `Kamu membuat ${data.count} soal latihan pilihan ganda dari transkrip kuliah.`,
      "Setiap soal punya 4 opsi, satu jawaban benar (tulis teks opsinya persis pada correct_answer), 1-2 petunjuk, dan pembahasan singkat.",
      "Semua soal harus bisa dijawab dari isi transkrip. Bahasa Indonesia, tanpa Markdown.",
      'Balas HANYA JSON: {"topic":"...","questions":[{"question_text":"...","options":["..."],"correct_answer":"...","hints":["..."],"solution":"...","topic":"..."}]}',
    ].join("\n");

    const raw = stripFences(await chat(system, [{ type: "text", text: data.transcript }]));
    try {
      return QuizSchema.parse(JSON.parse(raw));
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Soal dari AI tidak bisa dibaca, coba lagi");
      return QuizSchema.parse(JSON.parse(m[0]));
    }
  });
