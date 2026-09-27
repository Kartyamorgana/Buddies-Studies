import JSZip from "jszip";

export type MaterialKind = "pptx" | "docx" | "xlsx" | "pdf" | "audio" | "text" | "unsupported";

export const ACCEPTED_MATERIAL =
  ".pptx,.docx,.xlsx,.pdf,.txt,.md,.markdown,.csv,.json,.mp3,.wav,.m4a,.webm,.ogg,.aac,.flac,.mp4";

/** Absolute ceiling for any upload (1 GB). */
export const MAX_MATERIAL_BYTES = 1024 * 1024 * 1024;

/**
 * Per-kind limits. Files parsed locally in the browser (Office/teks) bisa sangat besar.
 * Audio & PDF harus dikirim ke AI, jadi batasnya lebih kecil agar tidak gagal di jaringan.
 */
export const KIND_LIMITS: Record<MaterialKind, number> = {
  pptx: 1024 * 1024 * 1024,
  docx: 1024 * 1024 * 1024,
  xlsx: 1024 * 1024 * 1024,
  text: 1024 * 1024 * 1024,
  pdf: 100 * 1024 * 1024,
  audio: 200 * 1024 * 1024,
  unsupported: 0,
};

export function limitFor(kind: MaterialKind) {
  return KIND_LIMITS[kind] ?? MAX_MATERIAL_BYTES;
}

export function formatBytes(n: number) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(n % 1024 ** 3 === 0 ? 0 : 1)} GB`;
  if (n >= 1024 ** 2) return `${Math.round(n / 1024 ** 2)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

export function detectKind(file: File): MaterialKind {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pptx")) return "pptx";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".xlsx")) return "xlsx";
  if (name.endsWith(".pdf")) return "pdf";
  if (/\.(mp3|wav|m4a|webm|ogg|aac|flac|mp4)$/.test(name)) return "audio";
  if (/\.(txt|md|markdown|csv|json)$/.test(name)) return "text";
  if (file.type.startsWith("audio/") || file.type.startsWith("video/")) return "audio";
  if (file.type.startsWith("text/")) return "text";
  return "unsupported";
}

export function kindLabel(kind: MaterialKind) {
  switch (kind) {
    case "pptx":
      return "Presentasi PowerPoint";
    case "docx":
      return "Dokumen Word";
    case "xlsx":
      return "Spreadsheet Excel";
    case "pdf":
      return "Dokumen PDF";
    case "audio":
      return "Audio / rekaman";
    case "text":
      return "Teks / Markdown";
    default:
      return "Tidak didukung";
  }
}

export async function fileToBase64(file: File) {
  const buf = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function xmlText(xml: string, tagRegex: RegExp) {
  const out: string[] = [];
  for (const m of xml.matchAll(tagRegex)) {
    const t = m[1]
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
    if (t.trim()) out.push(t);
  }
  return out;
}

/** Extract readable text from Office Open XML files (pptx/docx/xlsx) in the browser. */
export async function extractOfficeText(file: File, kind: MaterialKind): Promise<string> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  if (kind === "pptx") {
    const slidePaths = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort((a, b) => {
        const n = (s: string) => Number(s.match(/slide(\d+)\.xml/)![1]);
        return n(a) - n(b);
      });
    const parts: string[] = [];
    for (const p of slidePaths) {
      const xml = await zip.file(p)!.async("string");
      const lines = xmlText(xml, /<a:t[^>]*>([\s\S]*?)<\/a:t>/g);
      const notesPath = p.replace("ppt/slides/slide", "ppt/notesSlides/notesSlide");
      let notes: string[] = [];
      const notesFile = zip.file(notesPath);
      if (notesFile) {
        notes = xmlText(await notesFile.async("string"), /<a:t[^>]*>([\s\S]*?)<\/a:t>/g);
      }
      const idx = p.match(/slide(\d+)\.xml/)![1];
      parts.push(
        `--- Slide ${idx} ---\n${lines.join("\n")}${
          notes.length ? `\n[Catatan pembicara]\n${notes.join("\n")}` : ""
        }`,
      );
    }
    return parts.join("\n\n");
  }

  if (kind === "docx") {
    const f = zip.file("word/document.xml");
    if (!f) throw new Error("Dokumen Word tidak bisa dibaca");
    const xml = await f.async("string");
    // Pecah per page-break agar nomor halaman bisa dikutip di catatan.
    const pages = xml.split(/<w:br[^>]*w:type="page"[^>]*\/>/);
    const out: string[] = [];
    pages.forEach((chunk, i) => {
      const lines = xmlText(
        chunk.replace(/<\/w:p>/g, "</w:p>\n"),
        /<w:t[^>]*>([\s\S]*?)<\/w:t>/g,
      );
      if (lines.length) out.push(`--- Halaman ${i + 1} ---\n${lines.join("\n")}`);
    });
    return out.join("\n\n");
  }

  // xlsx
  const shared = zip.file("xl/sharedStrings.xml");
  const strings = shared
    ? xmlText(await shared.async("string"), /<t[^>]*>([\s\S]*?)<\/t>/g)
    : [];
  const sheetPaths = Object.keys(zip.files)
    .filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p))
    .sort();
  const rows: string[] = [];
  for (const p of sheetPaths) {
    const xml = await zip.file(p)!.async("string");
    rows.push(`--- Sheet ${p.match(/sheet(\d+)\.xml/)![1]} ---`);
    for (const row of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells: string[] = [];
      for (const c of row[1].matchAll(/<c[^>]*?(t="[^"]*")?[^>]*>([\s\S]*?)<\/c>/g)) {
        const isShared = (c[1] ?? "").includes('t="s"');
        const v = c[2].match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
        cells.push(isShared ? (strings[Number(v)] ?? "") : v);
      }
      if (cells.some((x) => x.trim())) rows.push(cells.join(" | "));
    }
  }
  return rows.join("\n");
}
