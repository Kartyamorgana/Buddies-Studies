// src/routes/_authenticated/kinesthetic.tsx
import { createFileRoute } from "@tanstack/react-router";
import { KinestheticLabPage } from "@/components/vark/KinestheticLabPage";

export const Route = createFileRoute("/_authenticated/kinesthetic")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Kinesthetic Lab — Belajar Sambil Bergerak" },
      {
        name: "description",
        content:
          "Susun langkah penyelesaian, balik kartu hafalan, dan mainkan simulasi rumus interaktif dari catatan atau materi STEM-mu sendiri.",
      },
      { property: "og:title", content: "Kinesthetic Lab — Belajar Sambil Bergerak" },
      {
        property: "og:description",
        content: "Puzzle langkah, kartu hafalan, dan simulasi rumus dari materimu sendiri.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KinestheticLabPage,
});
