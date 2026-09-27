// src/components/stem/StemAnalytics.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  RefreshCw,
  Target,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchRecentSessions,
  fetchWeakness,
  summarizeByCategory,
  type CategorySummary,
} from "@/lib/stem-db";
import type { StemSessionRow, WeaknessRow } from "@/lib/stem-schema";
import { getCategoryMeta, SNBT_CATEGORY_ORDER } from "@/lib/snbt-categories";

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}j ${m % 60}m`;
}

function fmtRelative(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} hari lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const SUBJECT_LABEL: Record<string, string> = {
  umum: "Penalaran Umum",
  kuantitatif: "Pengetahuan Kuantitatif",
  matematika: "Penalaran Matematika",
  custom: "STEM / Mapel Lain",
};

export function StemAnalytics() {
  const [loading, setLoading] = useState(true);
  const [weakness, setWeakness] = useState<WeaknessRow[]>([]);
  const [sessions, setSessions] = useState<StemSessionRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [w, s] = await Promise.all([fetchWeakness(), fetchRecentSessions(15)]);
      setWeakness(w);
      setSessions(s);
    } catch (e) {
      toast.error("Gagal memuat analitik", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary: CategorySummary[] = useMemo(
    () => summarizeByCategory(weakness),
    [weakness],
  );

  const summaryBySubject = useMemo(() => {
    const map = new Map<CategorySummary["subject"], CategorySummary>();
    for (const s of summary) map.set(s.subject, s);
    return map;
  }, [summary]);

  const weakTopics = useMemo(
    () =>
      [...weakness]
        .filter((w) => w.attempts >= 2 && w.accuracy_pct < 70)
        .sort((a, b) => a.accuracy_pct - b.accuracy_pct)
        .slice(0, 8),
    [weakness],
  );

  const totals = useMemo(() => {
    const attempts = weakness.reduce((n, w) => n + w.attempts, 0);
    const correct = weakness.reduce((n, w) => n + w.correct, 0);
    const finished = sessions.filter((s) => s.ended_at);
    const durationSum = finished.reduce((n, s) => n + s.duration_sec, 0);
    return {
      attempts,
      correct,
      accuracy: attempts > 0 ? Math.round((correct / attempts) * 1000) / 10 : 0,
      sessionsCount: finished.length,
      durationSum,
    };
  }, [weakness, sessions]);

  if (loading) {
    return (
      <div className="grid place-items-center py-20 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mb-2" />
        <div className="text-sm">Memuat analitik…</div>
      </div>
    );
  }

  const empty = totals.sessionsCount === 0 && totals.attempts === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Analitik & Pelacak Kelemahan
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Ringkasan performa latihan per kategori SNBT dan topik yang perlu diulang.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="h-8 gap-1" onClick={() => void load()}>
            <RefreshCw className="w-3.5 h-3.5" /> Segarkan
          </Button>
          <Button asChild size="sm" variant="ghost" className="h-8 gap-1">
            <Link to="/stem" search={{}}>
                <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Studio
            </Link>
          </Button>
        </div>
      </div>

      {empty && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <Target className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <div className="text-sm font-medium">Belum ada data latihan</div>
          <p className="text-xs text-muted-foreground mt-1">
            Selesaikan satu sesi latihan di tab <b>Latihan</b>, statistik akan muncul di sini.
          </p>
          <Button asChild size="sm" className="mt-4 gap-1">
            <Link to="/stem" search={{}}>
              <ArrowLeft className="w-3.5 h-3.5" /> Mulai latihan
            </Link>
          </Button>
        </div>
      )}

      {!empty && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Total soal dikerjakan"
              value={totals.attempts.toLocaleString("id-ID")}
              icon={<Target className="w-4 h-4" />}
            />
            <StatCard
              label="Akurasi rata-rata"
              value={`${totals.accuracy}%`}
              icon={<CheckCircle2 className="w-4 h-4" />}
              tone={totals.accuracy >= 70 ? "ok" : totals.accuracy >= 50 ? "warn" : "bad"}
            />
            <StatCard
              label="Sesi selesai"
              value={totals.sessionsCount.toString()}
              icon={<BarChart3 className="w-4 h-4" />}
            />
            <StatCard
              label="Total waktu belajar"
              value={fmtDuration(totals.durationSum)}
              icon={<Clock className="w-4 h-4" />}
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-2">Per Kategori SNBT</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SNBT_CATEGORY_ORDER.map((sid) => {
                const meta = getCategoryMeta(sid);
                const s = summaryBySubject.get(sid);
                const attempts = s?.totalAttempts ?? 0;
                const accuracy = s?.accuracyPct ?? 0;
                return (
                  <div key={sid} className={`rounded-2xl border-2 bg-card p-4 ${meta.accent}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold uppercase tracking-wider">
                        {meta.short}
                      </div>
                      <span
                        className={`text-[10px] font-medium rounded-full border px-2 py-0.5 ${meta.chip}`}
                      >
                        {attempts} soal
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-2">
                      {SUBJECT_LABEL[sid] ?? meta.short}
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <div className="text-2xl font-bold tabular-nums text-foreground">
                        {attempts > 0 ? `${accuracy}%` : "—"}
                      </div>
                      {s && s.weakTopics > 0 && (
                        <span className="text-[10px] text-destructive inline-flex items-center gap-0.5">
                          <TrendingDown className="w-3 h-3" />
                          {s.weakTopics} topik lemah
                        </span>
                      )}
                    </div>
                    {attempts > 0 && (
                      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-current opacity-70"
                          style={{ width: `${Math.min(100, accuracy)}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {weakTopics.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Topik yang Perlu Diulang
              </h2>
              <div className="rounded-2xl border border-border bg-card divide-y divide-border/60">
                {weakTopics.map((w, i) => {
                  const meta = getCategoryMeta(w.subject);
                  return (
                    <div
                      key={`${w.subject}-${w.topic}-${i}`}
                      className="p-3 flex items-center gap-3"
                    >
                      <span
                        className={`text-[10px] font-semibold rounded-full border px-2 py-0.5 shrink-0 ${meta.chip}`}
                      >
                        {meta.short}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {w.topic || "(tanpa topik)"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {w.correct}/{w.attempts} benar · terakhir {fmtRelative(w.last_seen)}
                        </div>
                      </div>
                      <div className="text-sm font-bold tabular-nums text-destructive shrink-0">
                        {w.accuracy_pct}%
                      </div>
                      <Button
                        asChild
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs gap-1 shrink-0"
                      >
                        <Link
                          to="/stem"
                          search={{ topic: w.topic, subject: w.subject, autostart: "1" }}
                        >
                          <Play className="w-3 h-3" /> Latihan
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {sessions.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-2">Sesi Terakhir</h2>
              <div className="rounded-2xl border border-border bg-card divide-y divide-border/60">
                {sessions.map((s) => {
                  const meta = getCategoryMeta(s.subject);
                  const pct = Math.round(s.score);
                  return (
                    <div key={s.id} className="p-3 flex items-center gap-3">
                      <span
                        className={`text-[10px] font-semibold rounded-full border px-2 py-0.5 shrink-0 ${meta.chip}`}
                      >
                        {meta.short}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {s.topic || "(tanpa topik)"} · {s.difficulty}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {s.correct_count}/{s.total_questions} benar · {fmtDuration(s.duration_sec)} ·{" "}
                          {fmtRelative(s.started_at)}
                          {s.mode === "exam" && " · ujian"}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-bold tabular-nums shrink-0 ${
                          pct >= 70
                            ? "text-primary"
                            : pct >= 50
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-destructive"
                        }`}
                      >
                        {pct}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad";
}) {
  const toneCls =
    tone === "ok"
      ? "text-primary"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "bad"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-1.5 text-2xl font-bold tabular-nums ${toneCls}`}>{value}</div>
    </div>
  );
}