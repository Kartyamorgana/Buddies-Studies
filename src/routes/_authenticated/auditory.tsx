// src/routes/_authenticated/auditory.tsx
import { createFileRoute } from "@tanstack/react-router";
import { AuditoryStudioPage } from "@/components/vark/AuditoryStudioPage";

export const Route = createFileRoute("/_authenticated/auditory")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Auditory Studio — Podcast Belajar Interaktif" },
      {
        name: "description",
        content:
          "Ubah catatan atau materi STEM menjadi podcast dua pembawa acara, dengarkan dengan pengatur kecepatan, dan tanya langsung saat dijeda.",
      },
      { property: "og:title", content: "Auditory Studio — Podcast Belajar Interaktif" },
      {
        property: "og:description",
        content: "Materi belajarmu jadi podcast interaktif yang bisa ditanyai kapan saja.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditoryStudioPage,
});
