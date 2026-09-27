// src/components/vark/KinestheticLabPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Hand,
  Layers,
  Loader2,
  ListOrdered,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { VarkHeader } from "./VarkHeader";
import { VarkSourcePicker, type VarkSource } from "./VarkSourcePicker";
import {
  generateFlashcards,
  generateSimulation,
  generateStepPuzzle,
} from "@/lib/vark.functions";
import { saveKinesthetic } from "@/lib/vark-db";
import {
  evalFormula,
  type Flashcard,
  type FlashcardDeck,
  type SimParam,
  type Simulation,
  type StepBlock,
  type StepPuzzle,
} from "@/lib/vark-schema";
import { cn } from "@/lib/utils";

type Mode = "puzzle" | "flashcard" | "simulation";

const MODES: { id: Mode; label: string; icon: typeof Hand; hint: string }[] = [
  { id: "puzzle", label: "Susun Langkah", icon: ListOrdered, hint: "Urutkan langkah penyelesaian" },
  { id: "flashcard", label: "Kartu Hafalan", icon: Layers, hint: "Balik kartu, tandai paham" },
  { id: "simulation", label: "Simulasi Rumus", icon: SlidersHorizontal, hint: "Geser nilai, lihat hasil" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/* ------------------------------- Puzzle ---------------------------------- */

function PuzzleBoard({
  puzzle,
  onFinish,
}: {
  puzzle: StepPuzzle;
  onFinish: (score: number, total: number) => void;
}) {
  const [order, setOrder] = useState<StepBlock[]>(() => shuffle(puzzle.steps));
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setOrder(shuffle(puzzle.steps));
    setChecked(false);
  }, [puzzle]);

  const correctIndex = useMemo(
    () => new Map(puzzle.steps.map((s, i) => [s.id, i])),
    [puzzle],
  );

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    setOrder(next);
    setChecked(false);
  };

  const score = order.filter((s, i) => correctIndex.get(s.id) === i).length;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">{puzzle.title}</h2>
        {puzzle.prompt && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{puzzle.prompt}</p>
        )}
      </div>

      <ol className="space-y-2">
        {order.map((s, i) => {
          const ok = correctIndex.get(s.id) === i;
          return (
            <li
              key={s.id}
              className={cn(
                "rounded-2xl border bg-card p-3 transition-colors",
                checked ? (ok ? "border-emerald-500/60" : "border-destructive/60") : "border-border",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-7 h-7 rounded-lg grid place-items-center text-xs font-semibold shrink-0",
                    checked
                      ? ok
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-destructive/15 text-destructive"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {checked ? (ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />) : i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{s.text}</p>
                  {checked && s.explain && (
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {s.explain}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label="Naikkan langkah"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    className="p-1 rounded hover:bg-accent disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Turunkan langkah"
                    onClick={() => move(i, i + 1)}
                    disabled={i === order.length - 1}
                    className="p-1 rounded hover:bg-accent disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setChecked(true);
            onFinish(score, order.length);
            if (score === order.length) toast.success("Semua langkah benar!");
            else toast.info(`${score} dari ${order.length} langkah sudah tepat`);
          }}
        >
          <Check className="w-3.5 h-3.5" /> Periksa urutan
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => {
            setOrder(shuffle(puzzle.steps));
            setChecked(false);
          }}
        >
          <Shuffle className="w-3.5 h-3.5" /> Acak ulang
        </Button>
        {checked && (
          <span className="text-xs text-muted-foreground ml-auto">
            Skor {score}/{order.length}
          </span>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Flashcards -------------------------------- */

function FlashcardBoard({
  deck,
  onFinish,
}: {
  deck: FlashcardDeck;
  onFinish: (score: number, total: number) => void;
}) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());

  useEffect(() => {
    setI(0);
    setFlipped(false);
    setKnown(new Set());
  }, [deck]);

  const card: Flashcard | undefined = deck.cards[i];
  const go = (d: number) => {
    setI((p) => Math.min(deck.cards.length - 1, Math.max(0, p + d)));
    setFlipped(false);
  };

  const mark = (ok: boolean) => {
    setKnown((prev) => {
      const next = new Set(prev);
      if (ok) next.add(i);
      else next.delete(i);
      onFinish(next.size, deck.cards.length);
      return next;
    });
    if (i < deck.cards.length - 1) go(1);
  };

  if (!card) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">{deck.title}</h2>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(known.size / deck.cards.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {known.size}/{deck.cards.length} paham
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="w-full min-h-52 rounded-2xl border border-border bg-card p-6 text-center grid place-items-center transition-colors hover:border-primary/60"
      >
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {flipped ? "Jawaban" : "Pertanyaan"}
          </div>
          <p className="mt-2 text-base font-medium leading-relaxed">
            {flipped ? card.back : card.front}
          </p>
          <div className="mt-3 text-[11px] text-muted-foreground">
            Ketuk kartu untuk {flipped ? "kembali" : "melihat jawaban"}
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => go(-1)} disabled={i === 0} className="gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
        </Button>
        <span className="text-xs text-muted-foreground">
          {i + 1} / {deck.cards.length}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => go(1)}
          disabled={i === deck.cards.length - 1}
          className="gap-1 mr-auto"
        >
          Berikutnya <ChevronRight className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => mark(false)}>
          <RotateCcw className="w-3.5 h-3.5" /> Ulangi
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => mark(true)}>
          <Check className="w-3.5 h-3.5" /> Paham
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------- Simulation -------------------------------- */

function SimulationBoard({ sim }: { sim: Simulation }) {
  const [params, setParams] = useState<SimParam[]>(sim.params);

  useEffect(() => setParams(sim.params), [sim]);

  const vars = useMemo(
    () => Object.fromEntries(params.map((p) => [p.key, p.value])),
    [params],
  );
  const result = evalFormula(sim.formula, vars);

  const xParam = params.find((p) => p.key === sim.xKey) ?? params[0]!;
  const points = useMemo(() => {
    const n = 40;
    const out: { x: number; y: number }[] = [];
    for (let k = 0; k <= n; k++) {
      const x = xParam.min + ((xParam.max - xParam.min) * k) / n;
      const y = evalFormula(sim.formula, { ...vars, [xParam.key]: x });
      if (y !== null) out.push({ x, y });
    }
    return out;
  }, [sim.formula, vars, xParam]);

  const path = useMemo(() => {
    if (points.length < 2) return "";
    const ys = points.map((p) => p.y);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    const span = yMax - yMin || 1;
    return points
      .map((p, idx) => {
        const px = (idx / (points.length - 1)) * 300;
        const py = 100 - ((p.y - yMin) / span) * 90 - 5;
        return `${idx === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(" ");
  }, [points]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">{sim.title}</h2>
        {sim.description && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{sim.description}</p>
        )}
        <code className="mt-2 inline-block rounded bg-muted px-2 py-1 text-[11px] font-mono">
          {sim.outputLabel} = {sim.formula}
        </code>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        {params.map((p, idx) => (
          <div key={p.key}>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={`sim-${p.key}`} className="text-xs font-medium">
                {p.label}
              </label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {p.value}
                {p.unit ? ` ${p.unit}` : ""}
              </span>
            </div>
            <input
              id={`sim-${p.key}`}
              type="range"
              min={p.min}
              max={p.max}
              step={p.step}
              value={p.value}
              onChange={(e) => {
                const v = Number(e.target.value);
                setParams((prev) =>
                  prev.map((q, qi) => (qi === idx ? { ...q, value: v } : q)),
                );
              }}
              className="mt-1.5 w-full accent-primary"
            />
          </div>
        ))}

        <div className="rounded-xl bg-primary/10 px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wider text-primary/80">
            {sim.outputLabel}
          </div>
          <div className="text-xl font-bold text-primary tabular-nums">
            {result === null ? "—" : Number(result.toPrecision(6)).toLocaleString("id-ID")}
            {sim.outputUnit ? ` ${sim.outputUnit}` : ""}
          </div>
        </div>

        {path && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Grafik terhadap {xParam.label}
            </div>
            <svg viewBox="0 0 300 100" className="w-full h-28" role="img" aria-label="Grafik hasil simulasi">
              <path d={path} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Page ------------------------------------ */

export function KinestheticLabPage() {
  const [source, setSource] = useState<VarkSource | null>(null);
  const [mode, setMode] = useState<Mode>("puzzle");
  const [busy, setBusy] = useState(false);
  const [puzzle, setPuzzle] = useState<StepPuzzle | null>(null);
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [sim, setSim] = useState<Simulation | null>(null);

  const record = useCallback(
    async (kind: Mode, title: string, payload: Record<string, unknown>, score = 0, total = 0) => {
      if (!source) return;
      try {
        await saveKinesthetic({
          kind,
          topic: source.topic,
          title,
          payload,
          score,
          total,
          completed: total > 0 && score === total,
        });
      } catch {
        /* progres tidak wajib tersimpan */
      }
    },
    [source],
  );

  const generate = async () => {
    if (!source) {
      toast.error("Pilih sumber materi dulu");
      return;
    }
    setBusy(true);
    try {
      const data = { topic: source.topic, material: source.material };
      if (mode === "puzzle") {
        const raw = await generateStepPuzzle({ data });
        const p: StepPuzzle = {
          ...raw,
          prompt: raw.prompt ?? "",
          steps: raw.steps.map((s) => ({ ...s, explain: s.explain ?? "" })),
        };
        setPuzzle(p);
        await record("puzzle", p.title, p as unknown as Record<string, unknown>);
      } else if (mode === "flashcard") {
        const d = await generateFlashcards({ data });
        setDeck(d);
        await record("flashcard", d.title, d as unknown as Record<string, unknown>);
      } else {
        const raw = await generateSimulation({ data });
        const s: Simulation = {
          ...raw,
          description: raw.description ?? "",
          outputLabel: raw.outputLabel ?? "Hasil",
          outputUnit: raw.outputUnit ?? "",
          params: raw.params.map((p) => ({ ...p, unit: p.unit ?? "" })),
        };
        setSim(s);
        await record("simulation", s.title, s as unknown as Record<string, unknown>);
      }
      toast.success("Materi siap dimainkan");
    } catch (e) {
      toast.error("Gagal membuat aktivitas", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const active = MODES.find((m) => m.id === mode)!;

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background text-foreground">
      <VarkHeader
        icon={<Hand className="w-4 h-4" />}
        title="Kinesthetic Lab"
        subtitle="Belajar dengan menyusun, membalik, dan mencoba"
      />

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl p-3 sm:p-6 space-y-4">
          <VarkSourcePicker value={source} onChange={setSource} />

          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="grid gap-1.5 sm:grid-cols-3">
              {MODES.map((m) => {
                const Icon = m.icon;
                const on = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={cn(
                      "rounded-xl border p-2.5 text-left transition-colors",
                      on
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-accent/40",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn("w-3.5 h-3.5 shrink-0", on && "text-primary")} />
                      <span className="text-xs font-semibold">{m.label}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {m.hint}
                    </div>
                  </button>
                );
              })}
            </div>

            <Button
              className="mt-3 w-full gap-1.5"
              size="sm"
              disabled={busy || !source}
              onClick={() => void generate()}
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {busy ? "Menyiapkan…" : `Buat ${active.label}`}
            </Button>
          </div>

          {mode === "puzzle" && puzzle && (
            <PuzzleBoard
              puzzle={puzzle}
              onFinish={(s, t) =>
                void record("puzzle", puzzle.title, puzzle as unknown as Record<string, unknown>, s, t)
              }
            />
          )}
          {mode === "flashcard" && deck && (
            <FlashcardBoard
              deck={deck}
              onFinish={(s, t) =>
                void record("flashcard", deck.title, deck as unknown as Record<string, unknown>, s, t)
              }
            />
          )}
          {mode === "simulation" && sim && <SimulationBoard sim={sim} />}

          {!puzzle && !deck && !sim && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <Hand className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
              <div className="text-sm font-medium">Belum ada aktivitas</div>
              <p className="text-xs text-muted-foreground mt-1">
                Pilih sumber materi di atas, lalu tekan tombol buat.
              </p>
            </div>
          )}
        </div>
      </main>

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
