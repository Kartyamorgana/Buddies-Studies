// src/routes/_authenticated/stem.analytics.tsx
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { StemAnalytics } from "@/components/stem/StemAnalytics";
import { StemTopNav } from "@/components/stem/StemTopNav";
import { HeaderActions } from "@/components/common/HeaderActions";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/stem/analytics")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Analitik STEM & SNBT" },
      {
        name: "description",
        content:
          "Dashboard performa latihan SNBT: akurasi per kategori PU/PK/PM, topik lemah, dan riwayat sesi.",
      },
    ],
  }),
  component: StemAnalyticsPage,
});

function StemAnalyticsPage() {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-background text-foreground">
      <header className="h-14 shrink-0 border-b border-border flex items-center gap-3 px-3 sm:px-4 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div className="hidden sm:block min-w-0">
            <div className="font-semibold leading-none text-sm truncate">
              Analitik STEM &amp; SNBT
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
              Pelacak kelemahan &amp; riwayat latihan
            </div>
          </div>
        </div>

        <StemTopNav className="ml-auto min-w-0" />

        <HeaderActions
          extras={[{ to: "/stem", label: "Studio", icon: ArrowLeft, title: "Kembali ke Studio" }]}
        />
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-5xl w-full p-3 sm:p-5">
          <StemAnalytics />
        </div>
      </main>

      <Toaster richColors position="bottom-right" />
    </div>
  );
}