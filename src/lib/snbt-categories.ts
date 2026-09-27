import {
  SUBJECTS,
  type SubjectId,
} from "@/lib/stem.functions";

export { SUBJECTS };
export type { SubjectId };

export type SnbtCategoryMeta = {
  id: SubjectId;
  short: string;              // label chip/pill pendek
  description: string;        // dipakai di kartu pilih kategori
  accent: string;             // kelas Tailwind untuk border/teks aksen
  chip: string;               // kelas Tailwind untuk badge
};

/**
 * Metadata presentasi per kategori SNBT/STEM.
 * Sumber kebenaran id & label tetap `SUBJECTS` dari stem.functions.ts —
 * file ini hanya menambahkan aspek UI (warna, ringkasan, chip).
 */
export const SNBT_CATEGORY_META: Record<SubjectId, SnbtCategoryMeta> = {
  umum: {
    id: "umum",
    short: "PU",
    description:
      "Penalaran induktif & deduktif, silogisme, analisis pernyataan, pola, dan kesimpulan logis.",
    accent: "border-sky-500/40 text-sky-600 dark:text-sky-400",
    chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  },
  kuantitatif: {
    id: "kuantitatif",
    short: "PK",
    description:
      "Bilangan, aljabar dasar, aritmetika sosial, perbandingan, himpunan, geometri, statistika, peluang.",
    accent: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  matematika: {
    id: "matematika",
    short: "PM",
    description:
      "Soal cerita kontekstual bergaya UTBK: pemodelan, penalaran multi-langkah, interpretasi data.",
    accent: "border-violet-500/40 text-violet-600 dark:text-violet-400",
    chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  },
  custom: {
    id: "custom",
    short: "STEM",
    description:
      "Mata pelajaran lain: fisika, kimia, biologi, atau topik STEM spesifik pilihanmu.",
    accent: "border-amber-500/40 text-amber-600 dark:text-amber-400",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
};

export const SNBT_CATEGORY_ORDER: SubjectId[] = [
  "umum",
  "kuantitatif",
  "matematika",
  "custom",
];

/** Ambil metadata aman (fallback ke custom bila id tidak dikenal). */
export function getCategoryMeta(id: string | null | undefined): SnbtCategoryMeta {
  if (id && id in SNBT_CATEGORY_META) {
    return SNBT_CATEGORY_META[id as SubjectId];
  }
  return SNBT_CATEGORY_META.custom;
}