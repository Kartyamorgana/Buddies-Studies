// src/lib/vark.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  FlashcardDeckSchema,
  PodcastScriptSchema,
  SimulationSchema,
  StepPuzzleSchema,
} from "./vark-schema";

const MaterialInput = z.object({
  topic: z.string().max(300).default(""),
  material: z.string().max(120000).default(""),
});

function parseJson<T>(raw: string, schema: z.ZodType<T>): T {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (fence) t = fence[1]!;
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  let obj: unknown;
  try {
    obj = JSON.parse(t);
  } catch {
    throw new Error("AI mengembalikan format tidak valid, coba lagi");
  }
  const res = schema.safeParse(obj);
  if (!res.success) throw new Error("Hasil AI tidak lengkap, coba lagi");
  return res.data;
}

async function ai(system: string, user: string): Promise<string> {
  const { chat } = await import("./ingest.server");
  return chat(system, [{ type: "text", text: user }]);
}

function sourceBlock(topic: string, material: string) {
  const m = material.trim();
  return [
    topic ? `TOPIK: ${topic}` : "",
    m ? `MATERI:\n${m.slice(0, 60000)}` : "Tidak ada materi mentah, gunakan topik di atas.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/* --------------------------- Auditory Studio ----------------------------- */

const PODCAST_SYSTEM = `Kamu produser podcast belajar berbahasa Indonesia.
Buat skrip percakapan santai tapi padat antara dua pembawa acara:
- A bernama "Rani" (pemandu, menjelaskan konsep dengan analogi sehari-hari)
- B bernama "Dimas" (penasaran, bertanya seperti siswa, menyimpulkan)
Aturan:
- 14-22 baris dialog bergantian, tiap baris 1-3 kalimat, natural untuk dibacakan.
- Jangan pakai Markdown, LaTeX, simbol matematika mentah, tanda bintang, atau emoji.
- Tulis rumus/angka dalam kata yang bisa dibaca ("setengah em ve kuadrat").
- Awali dengan sapaan singkat, tutup dengan ringkasan 3 poin oleh Dimas.
Balas HANYA JSON:
{"title":"...","summary":"...","lines":[{"speaker":"A","name":"Rani","text":"..."}]}`;

export const generatePodcast = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => MaterialInput.parse(d))
  .handler(async ({ data }) => {
    const raw = await ai(PODCAST_SYSTEM, sourceBlock(data.topic, data.material));
    return parseJson(raw, PodcastScriptSchema);
  });

const AskInput = z.object({
  question: z.string().min(1).max(2000),
  topic: z.string().max(300).default(""),
  material: z.string().max(60000).default(""),
  context: z.string().max(8000).default(""),
});

export const askHost = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AskInput.parse(d))
  .handler(async ({ data }) => {
    const text = await ai(
      `Kamu Rani, pembawa acara podcast belajar. Jawab pertanyaan pendengar dengan gaya ngobrol, hangat, maksimal 4 kalimat, bahasa Indonesia, tanpa Markdown/LaTeX. Kalau di luar materi, jawab tetap membantu dan katakan itu tambahan di luar materi.`,
      [
        sourceBlock(data.topic, data.material),
        data.context ? `BAGIAN YANG SEDANG DIBAHAS:\n${data.context}` : "",
        `PERTANYAAN PENDENGAR: ${data.question}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
    return { answer: text.trim() };
  });

/* -------------------------- Kinesthetic Studio --------------------------- */

const PUZZLE_SYSTEM = `Kamu tutor STEM. Pecah satu penyelesaian/proses dari materi menjadi 5-8 langkah berurutan yang harus disusun siswa.
Aturan: tiap langkah satu kalimat jelas, urut logis, "explain" berisi alasan singkat mengapa langkah itu di posisi tersebut. Gunakan bahasa Indonesia. Hindari LaTeX; tulis rumus sebagai teks biasa.
Balas HANYA JSON:
{"title":"...","prompt":"...","steps":[{"id":"s1","text":"...","explain":"..."}]}`;

export const generateStepPuzzle = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => MaterialInput.parse(d))
  .handler(async ({ data }) => {
    const raw = await ai(PUZZLE_SYSTEM, sourceBlock(data.topic, data.material));
    return parseJson(raw, StepPuzzleSchema);
  });

const FLASH_SYSTEM = `Kamu tutor. Buat 8-14 kartu hafalan dari materi.
Aturan: "front" berupa pertanyaan/istilah singkat, "back" jawaban padat maksimal 2 kalimat. Bahasa Indonesia, tanpa LaTeX.
Balas HANYA JSON: {"title":"...","cards":[{"front":"...","back":"..."}]}`;

export const generateFlashcards = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => MaterialInput.parse(d))
  .handler(async ({ data }) => {
    const raw = await ai(FLASH_SYSTEM, sourceBlock(data.topic, data.material));
    return parseJson(raw, FlashcardDeckSchema);
  });

const SIM_SYSTEM = `Kamu perancang simulasi belajar. Pilih satu hubungan kuantitatif dari materi dan ubah menjadi simulasi interaktif.
Aturan:
- "formula" harus ekspresi aritmetika JavaScript valid yang HANYA memakai key parameter, angka, + - * / ( ) dan Math.* (mis. "0.5*m*v*v" atau "Math.sin(t)*A").
- 2-4 parameter, key huruf kecil tanpa spasi, rentang masuk akal, "value" nilai awal di dalam rentang.
- "xKey" adalah key parameter yang dipakai sebagai sumbu X grafik.
Balas HANYA JSON:
{"title":"...","description":"...","formula":"...","outputLabel":"...","outputUnit":"...","xKey":"v","params":[{"key":"v","label":"Kecepatan","min":0,"max":20,"step":0.5,"value":5,"unit":"m/s"}]}`;

export const generateSimulation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => MaterialInput.parse(d))
  .handler(async ({ data }) => {
    const raw = await ai(SIM_SYSTEM, sourceBlock(data.topic, data.material));
    const sim = parseJson(raw, SimulationSchema);
    if (!sim.params.some((p) => p.key === sim.xKey)) {
      sim.xKey = sim.params[0]!.key;
    }
    return sim;
  });
