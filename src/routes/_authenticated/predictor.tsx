import { createFileRoute } from "@tanstack/react-router";
import { PredictorPage } from "@/features/utbk/PredictorPage";

export const Route = createFileRoute("/_authenticated/predictor")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Prediksi Skor UTBK — Analitik Kemampuan" },
      {
        name: "description",
        content:
          "Estimasi skor UTBK 200-1000 dari riwayat latihanmu dengan bobot tingkat kesulitan soal, lalu bandingkan dengan PTN & jurusan impian.",
      },
      { property: "og:title", content: "Prediksi Skor UTBK — Analitik Kemampuan" },
      {
        property: "og:description",
        content: "Estimasi skor UTBK dari riwayat latihan dan bandingkan dengan target kampusmu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PredictorPage,
});
