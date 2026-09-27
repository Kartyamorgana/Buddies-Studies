// src/lib/latex.ts
// Utilitas LaTeX yang dipakai bersama oleh Notes & STEM.
// Implementasi `normalizeMath` sengaja di-re-export dari MarkdownPreview
// agar kedua modul memakai satu sumber kebenaran (no drift).

export { normalizeMath } from "@/components/studynotes/MarkdownPreview";

/** Opsi KaTeX — SAMA dengan yang dipakai MarkdownPreview (teruji). */
export const KATEX_OPTIONS = { throwOnError: false, strict: false } as const;

/** True bila string mengandung minimal satu delimiter math (`$...$`, `$$...$$`, `\(...\)`, `\[...\]`). */
export function hasMathDelimiters(src: string): boolean {
  return /\$[^$\n]+\$|\$\$[\s\S]+?\$\$|\\\(|\\\[/.test(src);
}

/**
 * Bersihkan string LaTeX "mentah" (tanpa delimiter).
 * Dipakai untuk cheatsheet `formulas[].latex` yang memang datang tanpa `$`.
 * Toleran bila AI tidak sengaja menambahkan delimiter.
 */
export function stripMathDelimiters(src: string): string {
  let t = src.trim();
  if (t.startsWith("$$") && t.endsWith("$$")) t = t.slice(2, -2);
  else if (t.startsWith("\\[") && t.endsWith("\\]")) t = t.slice(2, -2);
  else if (t.startsWith("\\(") && t.endsWith("\\)")) t = t.slice(2, -2);
  else if (t.startsWith("$") && t.endsWith("$")) t = t.slice(1, -1);
  return t.trim();
}

/**
 * Bungkus LaTeX mentah menjadi delimiter inline — dipakai untuk
 * menggabungkan rumus ke dalam teks biasa (mis. di chat/export).
 */
export function toInlineMath(latex: string): string {
  return `$${stripMathDelimiters(latex)}$`;
}