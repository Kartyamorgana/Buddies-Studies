import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  BookCheck,
  Gamepad2,
  Loader2,
  RotateCcw,
  Check,
  X,
  Trophy,
  Layers,
  Link2,
  PenLine,
  Timer,
  Coffee,
  Sparkles,
  Pause,
  Play,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { generateStudyGame } from "@/lib/ingest.functions";
import { saveNoteGameSession } from "@/lib/note-games-db";

type Quiz = { question: string; options: string[]; answer: number; explanation: string };
type Card = { front: string; back: string };
type Pair = { term: string; definition: string };
type Blank = { sentence: string; answer: string; hint: string };
type Game = { quiz: Quiz[]; flashcards: Card[]; matching: Pair[]; blanks: Blank[] };

type GameType = "all" | "quiz" | "flashcards" | "matching" | "blanks";
type Difficulty = "easy" | "medium" | "hard";

const TYPES: { id: GameType; label: string; desc: string; icon: typeof Gamepad2 }[] = [
  { id: "quiz", label: "Kuis", desc: "Pilihan ganda", icon: Gamepad2 },
  { id: "flashcards", label: "Flashcard", desc: "Bolak-balik kartu", icon: Layers },
  { id: "matching", label: "Cocokkan", desc: "Istilah & definisi", icon: Link2 },
  { id: "blanks", label: "Isi rumpang", desc: "Lengkapi kalimat", icon: PenLine },
  { id: "all", label: "Campuran", desc: "Kuis + kartu + cocokkan", icon: Sparkles },
];

const DIFFS: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Mudah" },
  { id: "medium", label: "Sedang" },
  { id: "hard", label: "Sulit" },
];

const COUNTS = [6, 10, 15, 20, 30];

export function StudyGamePanel({
  content,
  noteId,
  noteTitle = "",
  onSessionSaved,
}: {
  content: string;
  noteId: string;
  noteTitle?: string;
  onSessionSaved?: () => void;
}) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<GameType>("quiz");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [timed, setTimed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [picked, setPicked] = useState<{ term?: string; def?: string }>({});
  const [matched, setMatched] = useState<string[]>([]);
  const [blankInput, setBlankInput] = useState<Record<number, string>>({});
  const [blankDone, setBlankDone] = useState<Record<number, boolean>>({});
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [subject, setSubject] = useState("");
  const [savingSession, setSavingSession] = useState(false);
  const [savedSession, setSavedSession] = useState(false);
  const run = useServerFn(generateStudyGame);

  const reset = () => {
    setAnswers({});
    setFlipped({});
    setPicked({});
    setMatched([]);
    setBlankInput({});
    setBlankDone({});
    setFinished(false);
    setPaused(false);
    setSavedSession(false);
  };

  const parts = Math.max(1, Math.min(6, Math.ceil(count / 6)));

  // jam berjalan (untuk riwayat)
  useEffect(() => {
    if (!game || finished || paused) return;
    const id = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [game, finished, paused]);

  // timer mode
  useEffect(() => {
    if (!timed || !game || finished || paused || secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((v) => {
        if (v <= 1) {
          setFinished(true);
          toast.info("Waktu habis!");
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timed, game, finished, paused, secondsLeft]);

  const generate = async () => {
    if (content.trim().length < 20) {
      toast.error("Catatan terlalu pendek untuk dibuat latihan");
      return;
    }
    setLoading(true);
    if (parts > 1) {
      toast.info(`Catatan panjang — dipecah jadi ${parts} bagian`, {
        description: "Butuh sekitar 1-3 menit, jangan tutup halaman.",
      });
    }
    try {
      const res = (await run({ data: { content, type, count, difficulty } })) as Game & {
        parts?: number;
        failedParts?: number;
      };
      setGame(res as Game);
      reset();
      setPaused(false);
      setElapsed(0);
      const total =
        res.quiz.length + res.flashcards.length + res.matching.length + res.blanks.length;
      setSecondsLeft(Math.max(60, total * (difficulty === "hard" ? 45 : 30)));
      if (res.failedParts) {
        toast.warning(`${res.failedParts} bagian gagal diproses`, {
          description: "Latihan dibuat dari bagian yang berhasil.",
        });
      } else {
        toast.success(`Latihan siap: ${total} item`);
      }
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("429")) toast.error("Terlalu banyak permintaan, coba lagi sebentar");
      else if (msg.includes("402")) toast.error("Kredit AI habis, tambah kredit di workspace");
      else toast.error("Gagal membuat latihan", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  // skor total mencakup kuis + cocokkan + rumpang
  const totals = useMemo(() => {
    if (!game) return { correct: 0, total: 0 };
    const quizCorrect = game.quiz.reduce(
      (acc, q, i) => (answers[i] === q.answer ? acc + 1 : acc),
      0,
    );
    const blanksCorrect = game.blanks.reduce(
      (acc, b, i) => (blankDone[i] && norm(blankInput[i] ?? "") === norm(b.answer) ? acc + 1 : acc),
      0,
    );
    const total = game.quiz.length + game.matching.length + game.blanks.length;
    const correct = quizCorrect + matched.length + blanksCorrect;
    return { correct, total };
  }, [game, answers, matched, blankDone, blankInput]);

  const saveResult = async () => {
    if (!game || savingSession) return;
    if (totals.total === 0) {
      toast.error("Belum ada item yang bisa dinilai");
      return;
    }
    setSavingSession(true);
    try {
      await saveNoteGameSession({
        noteId,
        noteTitle,
        subject,
        gameType: type === "all" ? "mixed" : type,
        difficulty,
        totalItems: totals.total,
        correctCount: totals.correct,
        durationSec: elapsed,
        timed,
      });
      setSavedSession(true);
      onSessionSaved?.();
      toast.success("Hasil latihan tersimpan ke riwayat");
    } catch (e) {
      toast.error("Gagal menyimpan hasil", { description: (e as Error).message });
    } finally {
      setSavingSession(false);
    }
  };

  const shuffledDefs = useMemo(() => {
    if (!game) return [];
    return [...game.matching].sort((a, b) => a.definition.localeCompare(b.definition));
  }, [game]);

  const tryMatch = (term?: string, def?: string) => {
    const next = { term: term ?? picked.term, def: def ?? picked.def };
    setPicked(next);
    if (next.term && next.def) {
      const ok = game?.matching.some((p) => p.term === next.term && p.definition === next.def);
      if (ok) {
        setMatched((m) => [...m, next.term!]);
        toast.success("Cocok!");
      } else {
        toast.error("Belum cocok");
      }
      setTimeout(() => setPicked({}), 250);
    }
  };

  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim();

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const locked = timed && (finished || paused);

  const settings = (compact = false) => (
    <div className={compact ? "space-y-3" : "space-y-4 text-left"}>
      <div>
        <div className="text-xs font-medium mb-1.5">Jenis latihan</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const on = type === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => setType(t.id)}
                className={`rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  on ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Icon className="w-3.5 h-3.5 text-primary" /> {t.label}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs font-medium mb-1.5">Jumlah soal</div>
          <div className="flex flex-wrap gap-1.5">
            {COUNTS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={count === c}
                onClick={() => setCount(c)}
                className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                  count === c
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium mb-1.5">Tingkat kesulitan</div>
          <div className="flex flex-wrap gap-1.5">
            {DIFFS.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={difficulty === d.id}
                onClick={() => setDifficulty(d.id)}
                className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                  difficulty === d.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs font-medium mb-1.5">Mode</div>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-pressed={!timed}
            onClick={() => setTimed(false)}
            className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
              !timed ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
            }`}
          >
            <Coffee className="w-3.5 h-3.5" /> Santai
          </button>
          <button
            type="button"
            aria-pressed={timed}
            onClick={() => setTimed(true)}
            className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
              timed ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
            }`}
          >
            <Timer className="w-3.5 h-3.5" /> Berwaktu
          </button>
        </div>
      </div>
    </div>
  );

  if (!game) {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-3">
            <Gamepad2 className="w-7 h-7" />
          </div>
          <h3 className="font-semibold mb-1">Mode Belajar Interaktif</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Pilih satu jenis latihan agar pembuatannya cepat dan ringan di semua perangkat.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {words.toLocaleString("id-ID")} kata
            {parts > 1 ? ` • diproses dalam ${parts} bagian` : ""}
          </p>
        </div>

        <div className="rounded-xl border border-border p-4">{settings()}</div>

        <Button onClick={generate} disabled={loading} className="gap-1 w-full mt-4">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Gamepad2 className="w-4 h-4" />
          )}
          {loading ? "Menyiapkan latihan..." : "Buat latihan"}
        </Button>
      </div>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const availableTabs = [
    game.quiz.length ? "quiz" : null,
    game.flashcards.length ? "cards" : null,
    game.matching.length ? "match" : null,
    game.blanks.length ? "blanks" : null,
  ].filter(Boolean) as string[];

  const pct = totals.total > 0 ? Math.round((totals.correct / totals.total) * 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-4" key={noteId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-sm font-medium">
          <span className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-primary" />
            {totals.correct}/{totals.total} · {pct}%
          </span>
          {timed && (
            <span
              className={`flex items-center gap-1 tabular-nums ${finished ? "text-destructive" : ""}`}
              role="timer"
              aria-live="off"
            >
              <Timer className="w-4 h-4" /> {mm}:{ss}
            </span>
          )}
          {timed && !finished && (
            <button
              type="button"
              onClick={() => setPaused((v) => !v)}
              title={paused ? "Lanjutkan waktu" : "Jeda waktu"}
              aria-label={paused ? "Lanjutkan waktu" : "Jeda waktu"}
              className="p-1.5 rounded hover:bg-accent transition-colors"
            >
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={reset} className="gap-1 h-8 text-xs">
            <RotateCcw className="w-3.5 h-3.5" /> Ulangi
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setGame(null)}
            className="gap-1 h-8 text-xs"
          >
            <Gamepad2 className="w-3.5 h-3.5" /> Latihan baru
          </Button>
        </div>
      </div>

      {locked && timed && !finished && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm text-center">
          Latihan dijeda — waktu berhenti. Tekan tombol putar untuk melanjutkan.
        </div>
      )}

      {locked && finished && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          Waktu habis — tekan <strong>Ulangi</strong> untuk mencoba lagi.
        </div>
      )}

      {savedSession ? (
        <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2.5 text-xs">
          <BookCheck className="w-4 h-4 text-primary shrink-0" />
          Hasil tersimpan ke riwayat latihan. Hilangkan latihan ini lewat tombol{" "}
          <strong>Latihan baru</strong>.
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2.5">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Mata pelajaran (manual, mis. Matematika) — opsional"
            aria-label="Mata pelajaran untuk latihan ini"
            className="h-8 flex-1 min-w-40"
          />
          <Button
            size="sm"
            onClick={() => void saveResult()}
            disabled={savingSession}
            className="h-8 gap-1"
          >
            {savingSession ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {savingSession ? "Menyimpan..." : "Simpan hasil"}
          </Button>
        </div>
      )}

      <Tabs defaultValue={availableTabs[0] ?? "quiz"}>
        <TabsList className="w-full h-auto flex-wrap">
          {game.quiz.length > 0 && (
            <TabsTrigger value="quiz" className="flex-1 gap-1 text-xs">
              <Gamepad2 className="w-3.5 h-3.5" /> Kuis
            </TabsTrigger>
          )}
          {game.flashcards.length > 0 && (
            <TabsTrigger value="cards" className="flex-1 gap-1 text-xs">
              <Layers className="w-3.5 h-3.5" /> Flashcard
            </TabsTrigger>
          )}
          {game.matching.length > 0 && (
            <TabsTrigger value="match" className="flex-1 gap-1 text-xs">
              <Link2 className="w-3.5 h-3.5" /> Cocokkan
            </TabsTrigger>
          )}
          {game.blanks.length > 0 && (
            <TabsTrigger value="blanks" className="flex-1 gap-1 text-xs">
              <PenLine className="w-3.5 h-3.5" /> Rumpang
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="quiz" className="space-y-4 mt-4">
          {game.quiz.map((q, i) => {
            const chosen = answers[i];
            const done = chosen !== undefined;
            return (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="font-medium text-sm mb-2">
                  {i + 1}. {q.question}
                </div>
                <div className="space-y-1.5">
                  {q.options.map((o, oi) => {
                    const isAnswer = oi === q.answer;
                    const state = !done
                      ? "idle"
                      : isAnswer
                        ? "correct"
                        : chosen === oi
                          ? "wrong"
                          : "idle";
                    return (
                      <button
                        key={oi}
                        type="button"
                        disabled={done || locked}
                        onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                        className={`w-full text-left text-sm px-3 py-2 rounded-md border transition-colors flex items-center gap-2 ${
                          state === "correct"
                            ? "border-primary bg-primary/10"
                            : state === "wrong"
                              ? "border-destructive bg-destructive/10"
                              : "border-border hover:bg-accent"
                        }`}
                      >
                        {state === "correct" && (
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                        {state === "wrong" && (
                          <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                        )}
                        <span>{o}</span>
                      </button>
                    );
                  })}
                </div>
                {done && q.explanation && (
                  <div className="mt-2 text-xs text-muted-foreground border-l-2 border-primary/40 pl-2">
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="cards" className="mt-4">
          <div className="grid sm:grid-cols-2 gap-3">
            {game.flashcards.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
                className="min-h-28 rounded-lg border border-border p-4 text-left hover:border-primary transition-colors"
              >
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                  {flipped[i] ? "Jawaban" : "Pertanyaan"}
                </div>
                <div className="text-sm">{flipped[i] ? c.back : c.front}</div>
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="match" className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              {game.matching.map((p) => {
                const done = matched.includes(p.term);
                return (
                  <button
                    key={p.term}
                    type="button"
                    disabled={done || locked}
                    onClick={() => tryMatch(p.term, undefined)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                      done
                        ? "border-primary bg-primary/10 opacity-60"
                        : picked.term === p.term
                          ? "border-primary"
                          : "border-border hover:bg-accent"
                    }`}
                  >
                    {p.term}
                  </button>
                );
              })}
            </div>
            <div className="space-y-2">
              {shuffledDefs.map((p) => {
                const done = matched.includes(p.term);
                return (
                  <button
                    key={p.definition}
                    type="button"
                    disabled={done || locked}
                    onClick={() => tryMatch(undefined, p.definition)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                      done
                        ? "border-primary bg-primary/10 opacity-60"
                        : picked.def === p.definition
                          ? "border-primary"
                          : "border-border hover:bg-accent"
                    }`}
                  >
                    {p.definition}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-3">
            Cocok: {matched.length}/{game.matching.length}
          </div>
        </TabsContent>

        <TabsContent value="blanks" className="mt-4 space-y-3">
          {game.blanks.map((b, i) => {
            const done = blankDone[i];
            const ok = done && norm(blankInput[i] ?? "") === norm(b.answer);
            return (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="text-sm mb-2">
                  {i + 1}. {b.sentence.replace(/_+/g, "______")}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={blankInput[i] ?? ""}
                    disabled={done || locked}
                    onChange={(e) => setBlankInput((v) => ({ ...v, [i]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setBlankDone((v) => ({ ...v, [i]: true }));
                    }}
                    placeholder="Jawabanmu..."
                    aria-label={`Jawaban soal ${i + 1}`}
                    className="h-9"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={done || locked || !(blankInput[i] ?? "").trim()}
                    onClick={() => setBlankDone((v) => ({ ...v, [i]: true }))}
                    className="h-9 shrink-0"
                  >
                    Periksa
                  </Button>
                </div>
                {b.hint && !done && (
                  <div className="text-[11px] text-muted-foreground mt-1.5">Petunjuk: {b.hint}</div>
                )}
                {done && (
                  <div
                    className={`text-xs mt-2 flex items-center gap-1 ${
                      ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                    }`}
                  >
                    {ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    {ok ? "Benar!" : `Jawaban: ${b.answer}`}
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
