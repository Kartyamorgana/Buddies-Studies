// Halaman Prediksi Skor UTBK: estimasi IRT + pembanding target kampus.
import { useEffect, useMemo, useState } from "react";
import { LineChart as LineChartIcon, Loader2, Save, Search, Target } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { VarkHeader } from "@/components/vark/VarkHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  buildPrediction,
  fetchAttempts,
  fetchCampuses,
  fetchPredictionHistory,
  savePrediction,
  weakTopics,
  type CampusRow,
} from "./db";
import type { PredictionResult } from "./irt";

export function PredictorPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campuses, setCampuses] = useState<CampusRow[]>([]);
  const [target, setTarget] = useState<CampusRow | null>(null);
  const [query, setQuery] = useState("");
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [weak, setWeak] = useState<ReturnType<typeof weakTopics>>([]);
  const [history, setHistory] = useState<
    { id: string; total: number; targetLabel: string; createdAt: string }[]
  >([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [cs, attempts, hist] = await Promise.all([
          fetchCampuses(),
          fetchAttempts(),
          fetchPredictionHistory(),
        ]);
        if (!alive) return;
        setCampuses(cs);
        setPrediction(buildPrediction(attempts));
        setWeak(weakTopics(attempts));
        setHistory(hist);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal memuat data");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? campuses.filter((c) => `${c.campus} ${c.major}`.toLowerCase().includes(q))
      : campuses;
    return list.slice(0, 40);
  }, [campuses, query]);

  const radarData = useMemo(
    () =>
      (prediction?.subjects ?? []).map((s) => ({
        subject: s.label,
        kamu: s.score,
        target: target ? (target.subscores[s.subject] ?? target.passing_score) : 0,
      })),
    [prediction, target],
  );

  const gap = target && prediction ? prediction.total - target.passing_score : 0;

  async function onSave() {
    if (!prediction) return;
    setSaving(true);
    try {
      await savePrediction({
        total: prediction.total,
        subjectScores: Object.fromEntries(prediction.subjects.map((s) => [s.subject, s.score])),
        ability: Object.fromEntries(
          prediction.subjects.map((s) => [s.subject, Math.round(s.theta * 1000) / 1000]),
        ),
        sampleSize: prediction.sampleSize,
        targetCampusId: target?.id ?? null,
        targetLabel: target ? `${target.campus} — ${target.major}` : "",
      });
      setHistory(await fetchPredictionHistory());
      toast.success("Prediksi tersimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-dvh flex flex-col">
      <VarkHeader
        icon={<LineChartIcon className="w-4 h-4" />}
        title="Prediksi Skor UTBK"
        subtitle="Estimasi skor dari riwayat latihanmu"
      />

      <main className="flex-1 overflow-y-auto p-3 sm:p-5">
        <div className="mx-auto w-full max-w-5xl space-y-4">
          {loading ? (
            <div className="grid place-items-center py-20 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Estimasi skor total</div>
                    <div className="text-4xl font-bold tabular-nums">
                      {prediction?.total ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      rentang {prediction?.low ?? 0}–{prediction?.high ?? 0} · skala 200–1000
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge variant="secondary">
                      Keyakinan: {prediction?.confidence ?? "rendah"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      dari {prediction?.sampleSize ?? 0} soal yang pernah dijawab
                    </span>
                  </div>
                  <Button
                    className="ml-auto gap-1"
                    size="sm"
                    onClick={onSave}
                    disabled={saving || !prediction?.sampleSize}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Simpan prediksi
                  </Button>
                </div>

                {!prediction?.sampleSize && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Belum ada riwayat latihan. Kerjakan beberapa soal di menu STEM &amp; SNBT dulu,
                    lalu kembali ke sini.
                  </p>
                )}
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-4">
                  <h2 className="text-sm font-semibold mb-2">Peta kemampuan per mata uji</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="72%">
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis domain={[200, 1000]} tick={{ fontSize: 10 }} />
                        <Radar
                          name="Kamu"
                          dataKey="kamu"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.35}
                        />
                        {target && (
                          <Radar
                            name="Target"
                            dataKey="target"
                            stroke="hsl(var(--destructive))"
                            fill="hsl(var(--destructive))"
                            fillOpacity={0.12}
                          />
                        )}
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3 mt-2">
                    {prediction?.subjects.map((s) => (
                      <div key={s.subject}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="truncate">{s.label}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {s.score} · {s.attempts} soal · {s.accuracyPct}%
                          </span>
                        </div>
                        <Progress value={((s.score - 200) / 800) * 100} />
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="space-y-4">
                  <Card className="p-4">
                    <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <Target className="w-4 h-4" /> Target PTN &amp; jurusan
                    </h2>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        placeholder="Cari kampus atau jurusan…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>

                    {target && (
                      <div className="mt-3 rounded-lg border border-border p-3">
                        <div className="font-medium text-sm">
                          {target.campus} — {target.major}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          perkiraan nilai ambang {target.passing_score} ·{" "}
                          {target.group_kind === "soshum" ? "Soshum" : "Saintek"}
                        </div>
                        <div
                          className={
                            "mt-2 text-sm font-semibold " +
                            (gap >= 0 ? "text-emerald-600" : "text-destructive")
                          }
                        >
                          {gap >= 0
                            ? `Sudah unggul ${gap} poin dari ambang`
                            : `Kurang ${Math.abs(gap)} poin lagi`}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 max-h-56 overflow-y-auto divide-y divide-border rounded-lg border border-border">
                      {filtered.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setTarget(c)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        >
                          <span className="font-medium">{c.campus}</span>{" "}
                          <span className="text-muted-foreground">— {c.major}</span>
                          <span className="float-right tabular-nums text-xs text-muted-foreground">
                            {c.passing_score}
                          </span>
                        </button>
                      ))}
                      {!filtered.length && (
                        <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                          Tidak ditemukan
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h2 className="text-sm font-semibold mb-2">Topik paling lemah</h2>
                    {weak.length ? (
                      <ul className="space-y-1.5 text-sm">
                        {weak.map((w) => (
                          <li key={`${w.subject}-${w.topic}`} className="flex justify-between gap-2">
                            <span className="truncate">{w.topic}</span>
                            <span className="tabular-nums text-muted-foreground shrink-0">
                              {w.accuracyPct}% · {w.n} soal
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Belum cukup data. Minimal 3 soal per topik.
                      </p>
                    )}
                  </Card>

                  {history.length > 0 && (
                    <Card className="p-4">
                      <h2 className="text-sm font-semibold mb-2">Riwayat prediksi</h2>
                      <ul className="space-y-1 text-sm">
                        {history.map((h) => (
                          <li key={h.id} className="flex justify-between gap-2">
                            <span className="truncate text-muted-foreground">
                              {new Date(h.createdAt).toLocaleDateString("id-ID")}{" "}
                              {h.targetLabel && `· ${h.targetLabel}`}
                            </span>
                            <span className="tabular-nums font-medium">{h.total}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
