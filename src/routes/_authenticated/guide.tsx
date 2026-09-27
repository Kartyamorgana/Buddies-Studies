// src/routes/_authenticated/guide.tsx
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bookmark,
  BookOpen,
  Calculator,
  Check,
  Compass,
  FlaskConical,
  Notebook,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { StemTopNav } from "@/components/stem/StemTopNav";
import { HeaderActions } from "@/components/common/HeaderActions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/guide")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Panduan Interaktif — StudyNotes & SNBT Prep" },
      {
        name: "description",
        content:
          "Ikuti langkah-langkah interaktif: buat catatan, pakai AI, latihan STEM & SNBT, dan pantau kelemahan belajarmu.",
      },
      { property: "og:title", content: "Panduan Interaktif — StudyNotes & SNBT Prep" },
      {
        property: "og:description",
        content: "Klik setiap langkah, halamannya langsung terbuka. Cocok untuk pemakai baru.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuidePage,
});

type Step = {
  id: string;
  title: string;
  detail: string;
  cta: string;
  icon: typeof BookOpen;
  go: () => void;
};

const STORAGE_KEY = "studynotes-guide-progress";

function GuidePage() {
  const navigate = useNavigate();
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDone(JSON.parse(raw) as string[]);
    } catch {
      /* abaikan */
    }
  }, []);

  const mark = useCallback((id: string) => {
    setDone((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* abaikan */
      }
      return next;
    });
  }, []);

  const steps: Step[] = [
    {
      id: "notes",
      title: "1. Buat catatan pertamamu",
      detail:
        "Buka ruang Catatan, tekan tombol tambah, lalu tulis bebas. Tulisan mendukung judul, daftar, tabel, dan rumus — tulis rumus di antara tanda $ seperti $E = mc^2$.",
      cta: "Buka Catatan",
      icon: BookOpen,
      go: () => void navigate({ to: "/" }),
    },
    {
      id: "ai",
      title: "2. Minta bantuan AI pada catatan",
      detail:
        "Di dalam catatan, pakai panel metode belajar untuk membuat ringkasan, pertanyaan latihan, atau penjelasan ulang dari materimu sendiri.",
      cta: "Coba di Catatan",
      icon: Sparkles,
      go: () => void navigate({ to: "/" }),
    },
    {
      id: "analyze",
      title: "3. Analisis materi di Studio STEM",
      detail:
        "Pilih sumber (catatan, berkas, atau sekadar topik), lalu jalankan Analisis untuk mendapat inti konsep, rumus penting, dan jebakan yang sering muncul.",
      cta: "Buka Studio STEM",
      icon: FlaskConical,
      go: () => void navigate({ to: "/stem" }),
    },
    {
      id: "cheatsheet",
      title: "4. Pelajari konsep & rumus secara mendalam",
      detail:
        "Tab Konsep & Rumus menyajikan pengertian konsep, penjelasan rumus, langkah pemakaian, dan contoh soal beserta pembahasan. Di bawahnya tersedia daftar rumus Matematika, Fisika, Kimia, dan Biologi yang bisa dicari kapan saja.",
      cta: "Pelajari Konsep",
      icon: Notebook,
      go: () => void navigate({ to: "/stem" }),
    },
    {
      id: "practice",
      title: "5. Latihan soal + papan hitung",
      detail:
        "Tab Latihan membuat soal sesuai tingkat kesulitan. Saat mengerjakan, buka Papan hitung untuk coret-coret dan mencari rumus tanpa keluar dari soal.",
      cta: "Mulai Latihan",
      icon: Trophy,
      go: () => void navigate({ to: "/stem" }),
    },
    {
      id: "bookmarks",
      title: "6. Simpan soal sulit ke Bank Soal",
      detail:
        "Tekan ikon penanda pada soal yang menantang. Semua soal tersimpan berkumpul di Bank Soal untuk diulang nanti.",
      cta: "Buka Bank Soal",
      icon: Bookmark,
      go: () => void navigate({ to: "/stem/bookmarks" }),
    },
    {
      id: "analytics",
      title: "7. Pantau kelemahan di Analitik",
      detail:
        "Analitik menunjukkan ketepatan per topik. Klik topik terlemah dan latihan baru langsung disiapkan dari topik itu.",
      cta: "Buka Analitik",
      icon: BarChart3,
      go: () => void navigate({ to: "/stem/analytics" }),
    },
    {
      id: "focus",
      title: "8. Jaga ritme dengan timer fokus",
      detail:
        "Timer fokus di header Studio membantu belajar 25 menit lalu istirahat singkat — cocok untuk sesi belajar panjang.",
      cta: "Lihat timer di Studio",
      icon: Calculator,
      go: () => void navigate({ to: "/stem" }),
    },
  ];

  const progress = Math.round((done.length / steps.length) * 100);

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background text-foreground">
      <header className="h-14 shrink-0 border-b border-border flex items-center gap-3 px-3 sm:px-4 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div className="hidden sm:block min-w-0">
            <div className="font-semibold leading-none text-sm truncate">Panduan Interaktif</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
              Klik langkahnya, halamannya terbuka
            </div>
          </div>
        </div>

        <StemTopNav className="ml-auto min-w-0" />

        <HeaderActions
          extras={[{ to: "/stem", label: "Studio", icon: ArrowLeft, title: "Kembali ke Studio" }]}
        />
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-3xl w-full p-3 sm:p-6 space-y-4">
          <section className="rounded-2xl border border-border bg-card p-4">
            <h1 className="text-lg font-bold tracking-tight">Mulai dari sini</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Delapan langkah singkat untuk mengenal seluruh fitur. Setiap langkah bisa diklik —
              halaman yang dimaksud akan langsung terbuka dan langkahnya ditandai selesai.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {done.length}/{steps.length} selesai
              </span>
            </div>
            {done.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 h-7 text-[11px]"
                onClick={() => {
                  setDone([]);
                  try {
                    localStorage.removeItem(STORAGE_KEY);
                  } catch {
                    /* abaikan */
                  }
                }}
              >
                Ulangi dari awal
              </Button>
            )}
          </section>

          <ol className="space-y-2.5">
            {steps.map((s) => {
              const isDone = done.includes(s.id);
              const Icon = s.icon;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      mark(s.id);
                      s.go();
                    }}
                    className={cn(
                      "w-full text-left rounded-2xl border bg-card p-4 transition-colors hover:border-primary/60 hover:bg-accent/40",
                      isDone ? "border-primary/50" : "border-border",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl grid place-items-center shrink-0",
                          isDone
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold leading-snug">{s.title}</div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {s.detail}
                        </p>
                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                          {s.cta} <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </main>

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
