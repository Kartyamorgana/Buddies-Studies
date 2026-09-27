import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  examDate: z.string().min(8),
  dailyMinutes: z.number().int().min(20).max(600),
  targetLabel: z.string().max(200).default(""),
  days: z.number().int().min(1).max(60),
  weaknesses: z
    .array(z.object({ subject: z.string(), topic: z.string(), accuracyPct: z.number() }))
    .max(20)
    .default([]),
  currentScore: z.number().min(0).max(1000).default(0),
});

const PlanSchema = z.object({
  title: z.string().min(1),
  days: z
    .array(
      z.object({
        dayIndex: z.number().int().min(0),
        tasks: z
          .array(
            z.object({
              subject: z.string().default(""),
              topic: z.string().default(""),
              title: z.string().min(1),
              detail: z.string().default(""),
              minutes: z.number().int().min(10).max(240).default(30),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

export type GeneratedPlan = z.infer<typeof PlanSchema>;

export const generateStudyPlan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { chat, stripFences } = await import("./ingest.server");

    const weak = data.weaknesses.length
      ? data.weaknesses
          .map((w) => `- ${w.subject} / ${w.topic}: akurasi ${w.accuracyPct}%`)
          .join("\n")
      : "Belum ada data kelemahan; buat rencana dasar yang menyeluruh untuk UTBK/SNBT.";

    const system = [
      "Kamu mentor persiapan UTBK/SNBT di Indonesia. Susun rencana belajar harian yang realistis dan spesifik.",
      `Rencana untuk ${data.days} hari ke depan (dayIndex 0 = hari ini) hingga hari ujian ${data.examDate}.`,
      `Total waktu belajar per hari sekitar ${data.dailyMinutes} menit; jumlah "minutes" semua tugas dalam satu hari harus mendekati angka itu.`,
      "Setiap hari berisi 2-4 tugas konkret, mis. \"Kerjakan 10 soal Penalaran Matematika topik Trigonometri\" dengan detail cara mengerjakannya.",
      "Prioritaskan topik dengan akurasi terendah di awal, sisipkan pengulangan (spaced repetition) di hari berikutnya, dan sediakan hari review menjelang ujian.",
      "Gunakan bahasa Indonesia, tanpa Markdown dan tanpa LaTeX.",
      'Balas HANYA JSON valid: {"title":"...","days":[{"dayIndex":0,"tasks":[{"subject":"","topic":"","title":"","detail":"","minutes":30}]}]}',
    ].join("\n");

    const user = [
      data.targetLabel ? `TARGET: ${data.targetLabel}` : "",
      data.currentScore ? `ESTIMASI SKOR SEKARANG: ${data.currentScore}` : "",
      `TOPIK LEMAH:\n${weak}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const raw = stripFences(await chat(system, [{ type: "text", text: user }]));
    try {
      return PlanSchema.parse(JSON.parse(raw));
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Rencana dari AI tidak bisa dibaca, coba lagi");
      return PlanSchema.parse(JSON.parse(m[0]));
    }
  });
