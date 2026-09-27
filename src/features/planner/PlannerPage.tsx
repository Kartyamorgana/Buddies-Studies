// Halaman Rencana Belajar Adaptif: AI menyusun agenda harian sampai hari ujian.
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck, Flame, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { VarkHeader } from "@/components/vark/VarkHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { generateStudyPlan } from "@/lib/planner.functions";
import { buildPrediction, fetchAttempts, weakTopics } from "@/features/utbk/db";
import {
  computeStreak,
  fetchActivePlan,
  fetchTasks,
  replacePlan,
  toggleTask,
  type NewTask,
  type PlanRow,
  type TaskRow,
} from "./db";

const todayKey = () => new Date().toISOString().slice(0, 10);

function addDays(base: string, n: number) {
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysUntil(dateStr: string) {
  const ms = new Date(`${dateStr}T00:00:00`).getTime() - new Date(`${todayKey()}T00:00:00`).getTime();
  return Math.round(ms / 86400000);
}

export function PlannerPage() {
  const generate = useServerFn(generateStudyPlan);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [examDate, setExamDate] = useState(addDays(todayKey(), 30));
  const [dailyMinutes, setDailyMinutes] = useState(90);
  const [targetLabel, setTargetLabel] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await fetchActivePlan();
        if (!alive) return;
        setPlan(p);
        if (p) {
          setExamDate(p.exam_date);
          setDailyMinutes(p.daily_minutes);
          setTargetLabel(p.target_label);
          const t = await fetchTasks(p.id);
          if (alive) setTasks(t);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal memuat rencana");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const streak = useMemo(() => computeStreak(tasks), [tasks]);
  const grouped = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const t of tasks) {
      const list = map.get(t.task_date) ?? [];
      list.push(t);
      map.set(t.task_date, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [tasks]);

  const doneCount = tasks.filter((t) => t.done).length;

  async function onGenerate() {
    const left = daysUntil(examDate);
    if (left < 1) {
      toast.error("Pilih tanggal ujian setelah hari ini");
      return;
    }
    setBusy(true);
    try {
      const attempts = await fetchAttempts();
      const pred = buildPrediction(attempts);
      const weak = weakTopics(attempts).map((w) => ({
        subject: w.subject,
        topic: w.topic,
        accuracyPct: w.accuracyPct,
      }));

      const days = Math.min(left, 30);
      const result = await generate({
        data: {
          examDate,
          dailyMinutes,
          targetLabel,
          days,
          weaknesses: weak,
          currentScore: pred.total,
        },
      });

      const rows: NewTask[] = result.days.flatMap((d) =>
        d.tasks.map((t, i) => ({
          task_date: addDays(todayKey(), Math.min(d.dayIndex, days - 1)),
          subject: t.subject,
          topic: t.topic,
          title: t.title,
          detail: t.detail,
          minutes: t.minutes,
          ord: i,
        })),
      );

      const saved = await replacePlan(
        {
          title: result.title,
          examDate,
          dailyMinutes,
          targetLabel,
          weaknesses: weak,
        },
        rows,
      );
      setPlan(saved);
      setTasks(await fetchTasks(saved.id));
      toast.success("Rencana belajar baru siap");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyusun rencana");
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(task: TaskRow, next: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: next } : t)));
    try {
      await toggleTask(task.id, next);
    } catch (e) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !next } : t)));
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan centang");
    }
  }

  return (
    <div className="h-dvh flex flex-col">
      <VarkHeader
        icon={<CalendarCheck className="w-4 h-4" />}
        title="Rencana Belajar"
        subtitle="Agenda harian sampai hari ujian"
      />

      <main className="flex-1 overflow-y-auto p-3 sm:p-5">
        <div className="mx-auto w-full max-w-4xl space-y-4">
          <Card className="p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="exam">Tanggal ujian</Label>
                <Input
                  id="exam"
                  type="date"
                  value={examDate}
                  min={addDays(todayKey(), 1)}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="minutes">Menit belajar / hari</Label>
                <Input
                  id="minutes"
                  type="number"
                  min={20}
                  max={600}
                  value={dailyMinutes}
                  onChange={(e) => setDailyMinutes(Number(e.target.value) || 90)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="target">Target (opsional)</Label>
                <Input
                  id="target"
                  placeholder="mis. Teknik Informatika ITB"
                  value={targetLabel}
                  onChange={(e) => setTargetLabel(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={onGenerate} disabled={busy} className="gap-1">
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {plan ? "Susun ulang rencana" : "Susun rencana"}
              </Button>
              {daysUntil(examDate) > 0 && (
                <Badge variant="secondary">H-{daysUntil(examDate)} menuju ujian</Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <Flame className="w-3.5 h-3.5" /> Rentetan {streak} hari
              </Badge>
            </div>
            {busy && (
              <p className="text-xs text-muted-foreground">
                AI sedang membaca topik yang sering salah dan menyusun agendamu…
              </p>
            )}
          </Card>

          {loading ? (
            <div className="grid place-items-center py-20 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : plan ? (
            <>
              <Card className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-sm truncate">{plan.title}</h2>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {doneCount}/{tasks.length} tugas
                  </span>
                </div>
                <Progress
                  className="mt-2"
                  value={tasks.length ? (doneCount / tasks.length) * 100 : 0}
                />
              </Card>

              <div className="space-y-3">
                {grouped.map(([date, list]) => {
                  const isToday = date === todayKey();
                  return (
                    <Card key={date} className={isToday ? "p-4 border-primary" : "p-4"}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold">
                          {new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", {
                            weekday: "long",
                            day: "numeric",
                            month: "short",
                          })}
                          {isToday && (
                            <Badge className="ml-2" variant="default">
                              Hari ini
                            </Badge>
                          )}
                        </h3>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {list.reduce((a, t) => a + t.minutes, 0)} menit
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {list.map((t) => (
                          <li key={t.id} className="flex gap-2.5">
                            <Checkbox
                              id={t.id}
                              checked={t.done}
                              onCheckedChange={(v) => onToggle(t, v === true)}
                              className="mt-0.5"
                            />
                            <label htmlFor={t.id} className="min-w-0 cursor-pointer">
                              <div
                                className={
                                  "text-sm font-medium " +
                                  (t.done ? "line-through text-muted-foreground" : "")
                                }
                              >
                                {t.title}
                              </div>
                              {t.detail && (
                                <div className="text-xs text-muted-foreground">{t.detail}</div>
                              )}
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {[t.subject, t.topic].filter(Boolean).join(" · ")}
                                {t.minutes ? ` · ${t.minutes} menit` : ""}
                              </div>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Belum ada rencana. Isi tanggal ujian lalu tekan “Susun rencana”.
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
