// src/routes/_authenticated/stem.index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { StemStudioPage } from "@/components/stem/StemStudioPage";

export const Route = createFileRoute("/_authenticated/stem/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    topic?: string;
    subject?: string;
    autostart?: "1";
  } => {
    const out: { topic?: string; subject?: string; autostart?: "1" } = {};
    if (typeof search.topic === "string") out.topic = search.topic;
    if (typeof search.subject === "string") out.subject = search.subject;
    if (search.autostart === "1") out.autostart = "1";
    return out;
  },
  head: () => ({
    meta: [
      { title: "STEM & SNBT Prep Studio" },
      {
        name: "description",
        content:
          "Analisis materi, generator soal, dan latihan interaktif untuk Matematika, Fisika, Logika, dan persiapan UTBK SNBT.",
      },
      { property: "og:title", content: "STEM & SNBT Prep Studio" },
      {
        property: "og:description",
        content:
          "Belajar STEM dan SNBT dengan AI: analisis materi, catatan konsep & rumus, dan quiz interaktif.",
      },
    ],
  }),
  component: StemStudioRoute,
});

function StemStudioRoute() {
  const search = Route.useSearch();
  return <StemStudioPage initialTopic={search.topic} initialSubject={search.subject} />;
}
