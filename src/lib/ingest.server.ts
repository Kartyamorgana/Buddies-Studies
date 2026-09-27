import { getAiConfig } from "./ai-config.server";

function key() {
  return getAiConfig().apiKey;
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "file"; file: { filename: string; file_data: string } }
  | { type: "image_url"; image_url: { url: string } };

export async function chat(system: string, blocks: ContentBlock[]) {
  const cfg = getAiConfig();
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.chatModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: blocks },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`AI ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("AI mengembalikan hasil kosong");
  return text;
}

export async function transcribe(base64: string, mime: string, filename: string) {
  const cfg = getAiConfig();
  const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const form = new FormData();
  form.append("model", cfg.transcribeModel);
  form.append("file", new Blob([bin], { type: mime }), filename);

  const res = await fetch(`${cfg.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(
      `Transkripsi ${res.status}: ${await res.text().catch(() => "")}`,
    );
  }
  const json = (await res.json()) as { text?: string };
  const text = (json.text ?? "").trim();
  if (!text) throw new Error("Audio tidak menghasilkan teks (mungkin sunyi)");
  return text;
}

export function stripFences(s: string) {
  const t = s.trim();
  const m = t.match(/^```(?:json|markdown|md)?\s*\n([\s\S]*?)\n```$/);
  return m ? m[1] : t;
}

function repairJson(src: string) {
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  let lastSafe = -1;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") stack.push(c === "{" ? "}" : "]");
    else if (c === "}" || c === "]") {
      stack.pop();
      if (stack.length <= 2) lastSafe = i + 1;
    } else if (c === "," && stack.length <= 2) lastSafe = i;
  }

  let out = src;
  if (inStr || stack.length) {
    if (lastSafe > 0) {
      out = src.slice(0, lastSafe).replace(/,\s*$/, "");
      const open: string[] = [];
      let s2 = false;
      let e2 = false;
      for (const ch of out) {
        if (s2) {
          if (e2) e2 = false;
          else if (ch === "\\") e2 = true;
          else if (ch === '"') s2 = false;
          continue;
        }
        if (ch === '"') s2 = true;
        else if (ch === "{") open.push("}");
        else if (ch === "[") open.push("]");
        else if (ch === "}" || ch === "]") open.pop();
      }
      out += open.reverse().join("");
    } else {
      out = (inStr ? `${src}"` : src) + stack.reverse().join("");
    }
  }
  return out;
}

export function parseLooseJson(raw: string): unknown {
  const text = stripFences(raw).trim();
  const attempts = [text];
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0) {
    if (end > start) attempts.push(text.slice(start, end + 1));
    attempts.push(repairJson(text.slice(start)));
  }
  for (const a of attempts) {
    try {
      return JSON.parse(a);
    } catch {
      /* coba kandidat berikutnya */
    }
  }
  throw new Error("Jawaban AI tidak berbentuk JSON yang bisa dibaca");
}