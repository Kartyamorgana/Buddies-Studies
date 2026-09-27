import { createFileRoute } from "@tanstack/react-router";
import { LecturePage } from "@/features/lecture/LecturePage";

export const Route = createFileRoute("/_authenticated/lecture")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Transkrip Kuliah — Rekaman Jadi Catatan & Soal" },
      {
        name: "description",
        content:
          "Rekam penjelasan guru atau unggah audio, ubah jadi transkrip lengkap, lalu satu klik menjadi catatan rapi, soal latihan, naskah podcast, atau puzzle langkah.",
      },
      { property: "og:title", content: "Transkrip Kuliah — Rekaman Jadi Catatan & Soal" },
      {
        property: "og:description",
        content: "Rekam atau unggah audio kuliah, ubah jadi catatan, soal, podcast, atau puzzle.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LecturePage,
});
