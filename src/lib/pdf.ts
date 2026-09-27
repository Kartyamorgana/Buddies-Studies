// Pembaca PDF di sisi peramban.
// Strategi: ambil teks per halaman. Halaman tanpa teks (hasil scan atau
// ekspor PowerPoint) dirender jadi gambar JPEG agar bisa dibaca AI sebagai gambar.

export type PdfProgress = { page: number; total: number; phase: "text" | "image" };

export type PdfExtract = {
  /** Teks gabungan per halaman (kosong bila seluruh halaman berupa gambar). */
  text: string;
  /** Gambar halaman dalam bentuk data URL JPEG untuk halaman tanpa teks. */
  images: string[];
  pages: number;
  imagePages: number[];
  truncated: boolean;
};

/** Halaman gambar maksimum yang dikirim ke AI dalam satu proses. */
export const MAX_IMAGE_PAGES = 40;

const MIN_CHARS_PER_PAGE = 40;

export function isPdfPasswordError(e: unknown) {
  const n = (e as { name?: string })?.name ?? "";
  const m = (e as Error)?.message ?? "";
  return n === "PasswordException" || /password/i.test(m);
}

export async function extractPdf(
  file: File,
  opts: { maxImagePages?: number; onProgress?: (p: PdfProgress) => void } = {},
): Promise<PdfExtract> {
  const maxImages = opts.maxImagePages ?? MAX_IMAGE_PAGES;
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const total = doc.numPages;

  const pageTexts: string[] = [];
  const emptyPages: number[] = [];

  for (let i = 1; i <= total; i++) {
    opts.onProgress?.({ page: i, total, phase: "text" });
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length >= MIN_CHARS_PER_PAGE) {
      pageTexts.push(`--- Halaman ${i} ---\n${text}`);
    } else {
      emptyPages.push(i);
      if (text) pageTexts.push(`--- Halaman ${i} ---\n${text}`);
    }
    page.cleanup();
  }

  const images: string[] = [];
  const imagePages = emptyPages.slice(0, maxImages);
  for (let idx = 0; idx < imagePages.length; idx++) {
    const n = imagePages[idx]!;
    opts.onProgress?.({ page: idx + 1, total: imagePages.length, phase: "image" });
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(1600, Math.round(viewport.width));
    canvas.height = Math.round((canvas.width / viewport.width) * viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    const scaled = page.getViewport({ scale: canvas.width / page.getViewport({ scale: 1 }).width });
    await page.render({ canvas, canvasContext: ctx, viewport: scaled }).promise;
    images.push(canvas.toDataURL("image/jpeg", 0.72));
    page.cleanup();
  }

  await (doc as unknown as { destroy?: () => Promise<void> }).destroy?.();

  return {
    text: pageTexts.join("\n\n"),
    images,
    pages: total,
    imagePages,
    truncated: emptyPages.length > imagePages.length,
  };
}
