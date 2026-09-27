import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  mode: z.enum(["refine", "summarize"]),
  content: z.string().min(1).max(1000000),
});

const REFINE_SYSTEM =
  "Kamu adalah asisten yang merapikan catatan belajar pemrograman. Perbaiki struktur, tata bahasa, tambahkan penjelasan jika kurang, pastikan format Markdown rapi (heading, list, code block). Jangan mengubah makna asli. Output hanya konten yang sudah dirapikan dalam bahasa yang sama.";

const SUMMARIZE_SYSTEM =
  "Ringkas catatan berikut menjadi poin-poin kunci yang mudah dipahami dan diingat. Gunakan bullet list Markdown. Jangan menambahkan informasi di luar isi catatan.";

const CHUNK_CHARS = 18000;

/** Pecah catatan panjang berdasarkan heading agar tiap bagian aman diproses AI. */
export function chunkMarkdown(content: string, maxChars = CHUNK_CHARS) {
  if (content.length <= maxChars) return [content];
  const lines = content.split("\n");
  const blocks: string[] = [];
  let cur: string[] = [];
  let fence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) fence = !fence;
    if (!fence && /^#{1,3}\s/.test(line) && cur.join("\n").trim().length > 400) {
      blocks.push(cur.join("\n"));
      cur = [];
    }
    cur.push(line);
  }
  if (cur.length) blocks.push(cur.join("\n"));

  const out: string[] = [];
  let buf = "";
  for (const b of blocks) {
    let piece = b;
    while (piece.length > maxChars) {
      out.push(piece.slice(0, maxChars));
      piece = piece.slice(maxChars);
    }
    if (buf && buf.length + piece.length > maxChars) {
      out.push(buf);
      buf = piece;
    } else {
      buf = buf ? `${buf}\n${piece}` : piece;
    }
  }
  if (buf.trim()) out.push(buf);
  return out;
}

export const runNoteAi = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { getAiConfig } = await import("./ai-config.server");
    const { createAiProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");

    const cfg = getAiConfig();
    const gateway = createAiProvider(cfg.apiKey);
    const model = gateway(cfg.chatModel);

    const chunks = chunkMarkdown(data.content);

    const runOne = async (system: string, prompt: string) => {
      const { text } = await generateText({ model, system, prompt });
      return text.trim();
    };

    if (chunks.length === 1) {
      const text = await runOne(
        data.mode === "refine" ? REFINE_SYSTEM : SUMMARIZE_SYSTEM,
        chunks[0]!,
      );
      return { text, parts: 1, failedParts: 0 };
    }

    const baseSystem =
      data.mode === "refine" ? REFINE_SYSTEM : SUMMARIZE_SYSTEM;
    const results: (string | null)[] = new Array(chunks.length).fill(null);
    let failed = 0;

    // proses 2 bagian sekaligus agar tidak kena rate limit
    for (let i = 0; i < chunks.length; i += 2) {
      const idx = [i, i + 1].filter((n) => n < chunks.length);
      const settled = await Promise.allSettled(
        idx.map((n) =>
          runOne(
            `${baseSystem}\nIni bagian ${n + 1} dari ${chunks.length} sebuah catatan panjang. Proses HANYA bagian ini, jangan menambahkan pembuka/penutup meta, dan jangan mengulang isi bagian lain.`,
            chunks[n]!,
          ),
        ),
      );
      settled.forEach((s, j) => {
        if (s.status === "fulfilled") results[idx[j]!] = s.value;
        else failed += 1;
      });
    }

    const ok = results.filter((r): r is string => !!r && r.trim().length > 0);
    if (!ok.length) throw new Error("Gagal memproses catatan panjang, coba lagi");

    let text = ok.join("\n\n");

    if (data.mode === "summarize" && ok.length > 1 && text.length < 60000) {
      try {
        text = await runOne(
          "Gabungkan beberapa ringkasan bagian berikut menjadi satu ringkasan akhir yang rapi, terstruktur per tema, tanpa pengulangan. Gunakan heading dan bullet Markdown, bahasa yang sama dengan sumber.",
          text,
        );
      } catch {
        /* pakai gabungan mentah bila penggabungan gagal */
      }
    }

    return { text, parts: chunks.length, failedParts: failed };
  });