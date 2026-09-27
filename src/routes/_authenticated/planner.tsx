import { createFileRoute } from "@tanstack/react-router";
import { PlannerPage } from "@/features/planner/PlannerPage";

export const Route = createFileRoute("/_authenticated/planner")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Rencana Belajar Adaptif — Agenda Harian UTBK" },
      {
        name: "description",
        content:
          "AI menyusun agenda belajar harian sampai hari ujian berdasarkan topik yang paling sering kamu salah, lengkap dengan centang tugas dan rentetan harian.",
      },
      { property: "og:title", content: "Rencana Belajar Adaptif — Agenda Harian UTBK" },
      {
        property: "og:description",
        content: "Agenda belajar harian otomatis sampai hari ujian, disusun dari kelemahanmu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlannerPage,
});
