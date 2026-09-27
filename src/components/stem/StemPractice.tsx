// src/components/stem/StemPractice.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  BarChart3,
  Bookmark,
  BookmarkCheck,
  Loader2,
  Lightbulb,
  Timer,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trophy,
  Pause,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownPreview } from "@/components/studynotes/MarkdownPreview";
import { ScratchpadDrawer } from "./ScratchpadDrawer";
import {
  generateStemQuiz,
  SUBJECTS,
  type SubjectId,
  type StemQuestion,
} from "@/lib/stem.functions";
import {
  bookmarkQuestion,
  createStemSession,
  fetchBookmarks,
  finishStemSession,
  insertStemQuestions,
  removeBookmarkByText,
} from "@/lib/stem-db";
import type { StemMode } from "@/lib/stem-schema";

type Difficulty = "easy" | "medium" | "hard" | "hots";
const DIFFS: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Mudah" },
  { id: "medium", label: "Sedang" },
  { id: "hard", label: "Sulit" },
  { id: "hots", label: "HOTS / UTBK" },
];
const COUNTS = [5, 8, 10, 15, 20];

function normNum(s: string) {
  return s.replace(/\s|,/g, (m) => (m === "," ? "." : "")).replace(/[^\d.\-+/]/g, "");
}

function isCorrect(q: StemQuestion, given: string) {
  if (!given.trim()) return false;
  if (q.type === "num") {
    const a = Number(normNum(q.answer));
    const b = Number(normNum(given));
    if (Number.isFinite(a) && Number.isFinite(b)) return Math.abs(a - b) < 1e-6;
    return normNum(q.answer) === normNum(given);
  }
  return given.trim() === q.answer.trim();
}

export function StemPractice({
  subject,
  material,
  topic,
  initialDifficulty,
}: {
  subject: SubjectId;
  material?: string;
  topic?: string;
  initialDifficulty?: Difficulty;
}) {
  const gen = useServerFn(generateStemQuiz);
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty ?? "medium");
  const [exam, setExam] = useState(false);
  const [minutes, setMinutes] = useState(20);
  const [ownTopic, setOwnTopic] = useState("");
  const [busy, setBusy] = useState(false);

  const [questions, setQuestions] = useState<StemQuestion[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [hintLevel, setHintLevel] = useState<Record<number, number>>({});
  const [left, setLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [bookmarkedTexts, setBookmarkedTexts] = useState<Set<string>>(new Set());
  const [bookmarkBusy, setBookmarkBusy] = useState<string | null>(null);
  const [retryRound, setRetryRound] = useState(1);
  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const elapsedRef = useRef(0);
  const savingRef = useRef(false);

  // Sync difficulty when parent changes
  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  // Fetch existing bookmarks saat mount
  useEffect(() => {
    fetchBookmarks()
      .then((rows) => setBookmarkedTexts(new Set(rows.map((b) => b.question_text))))
      .catch(() => {
        /* non-critical */
      });
  }, []);

  // Timer (bisa dijeda)
  useEffect(() => {
    if (!questions || finished || paused) return;
    const t = setInterval(() => {
      setElapsed((v) => {
        elapsedRef.current = v + 1;
        return v + 1;
      });
      if (exam) {
        setLeft((v) => {
          if (v <= 1) {
            void submitSession(true);
            return 0;
          }
          return v - 1;
        });
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, finished, exam, paused]);

  const score = useMemo(() => {
    if (!questions) return 0;
    return questions.reduce(
      (acc, q, i) => acc + (isCorrect(q, answers[i] ?? "") ? 1 : 0),
      0,
    );
  }, [questions, answers]);

  const wrongCount = useMemo(() => {
    if (!questions) return 0;
    return questions.length - score;
  }, [questions, score]);

  const run = async (overrides?: {
    count?: number;
    difficulty?: Difficulty;
    questions?: StemQuestion[];
  }) => {
    const t = ownTopic.trim() || topic?.trim();
    if (!overrides?.questions && !t && !material?.trim()) {
      toast.error("Analisis materi dulu atau tulis topik soal");
      return;
    }

    setBusy(true);
    try {
      let nextQuestions: StemQuestion[];
      if (overrides?.questions) {
        nextQuestions = overrides.questions;
      } else {
        const res = await gen({
          data: {
            subject,
            difficulty: overrides?.difficulty ?? difficulty,
            count: overrides?.count ?? count,
            topic: t || undefined,
            material: material?.trim() ? material.slice(0, 120000) : undefined,
          },
        });
        nextQuestions = res.questions;
      }

      setQuestions(nextQuestions);
      setIdx(0);
      setAnswers({});
      setRevealed({});
      setHintLevel({});
      setFinished(false);
      setSavedSessionId(null);
      const estSec = exam ? (overrides?.questions?.length ?? count) * 90 : 0;
      setLeft(exam ? Math.max(60, estSec) : 0);
      startedAt.current = Date.now();
      setElapsed(0);
      elapsedRef.current = 0;
      setPaused(false);
      toast.success(`${nextQuestions.length} soal siap`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat soal");
    } finally {
      setBusy(false);
    }
  };

  const retryWrong = () => {
    if (!questions) return;
    const wrong = questions.filter((q, i) => !isCorrect(q, answers[i] ?? ""));
    if (wrong.length === 0) {
      toast.info("Semua jawaban benar — tidak ada yang perlu diulang 🎉");
      return;
    }
    setRetryRound((r) => r + 1);
    void run({ questions: wrong, count: wrong.length });
  };

  const toggleBookmark = async (q: StemQuestion) => {
    const text = q.question;
    if (bookmarkBusy === text) return;
    setBookmarkBusy(text);
    try {
      if (bookmarkedTexts.has(text)) {
        await removeBookmarkByText(text);
        setBookmarkedTexts((prev) => {
          const next = new Set(prev);
          next.delete(text);
          return next;
        });
        toast.success("Bookmark dihapus");
      } else {
        await bookmarkQuestion({
          subject,
          question_text: q.question,
          type: q.type,
          options: q.options,
          correct_answer: q.answer,
          solution: q.solution,
          hints: q.hints,
          topic: q.topic,
        });
        setBookmarkedTexts((prev) => new Set(prev).add(text));
        toast.success("Soal disimpan ke Bookmark");
      }
    } catch (e) {
      toast.error("Gagal update bookmark", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBookmarkBusy(null);
    }
  };

  const submitSession = useCallback(
    async (auto = false) => {
      if (!questions || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      try {
        const correctCount = questions.reduce(
          (n, q, i) => n + (isCorrect(q, answers[i] ?? "") ? 1 : 0),
          0,
        );
        const durationSec = Math.max(1, elapsedRef.current);
        const mode: StemMode = exam ? "exam" : "relaxed";

        const session = await createStemSession({
          subject,
          difficulty,
          mode,
          topic: (ownTopic.trim() || topic || "").trim() || null,
          time_limit_sec: exam ? minutes * 60 : null,
          total_questions: questions.length,
        });

        await insertStemQuestions(
          questions.map((q, i) => ({
            session_id: session.id,
            ord: i + 1,
            question_text: q.question,
            type: q.type,
            options: q.options,
            correct_answer: q.answer,
            user_answer: answers[i] ?? null,
            is_correct: answers[i] ? isCorrect(q, answers[i]) : null,
            hints: q.hints,
            solution: q.solution,
            topic: q.topic,
          })),
        );

        await finishStemSession({
          sessionId: session.id,
          correctCount,
          totalQuestions: questions.length,
          durationSec,
        });

        setSavedSessionId(session.id);
        setFinished(true);
        if (auto) toast.info("Waktu habis — sesi otomatis dikumpulkan");
        else toast.success("Sesi tersimpan");
      } catch (e) {
        toast.error("Gagal menyimpan sesi", {
          description: e instanceof Error ? e.message : undefined,
        });
        setFinished(true);
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [questions, answers, subject, difficulty, exam, topic, ownTopic, minutes],
  );

  const mmss = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  /* --------------------------- CONFIG SCREEN ----------------------------- */
  if (!questions) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5">Jumlah soal</div>
          <div className="flex flex-wrap gap-2">
            {COUNTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCount(c)}
                aria-pressed={count === c}
                className={`h-9 min-w-11 rounded-lg border px-3 text-xs font-medium transition-colors ${
                  count === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5">Tingkat kesulitan</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DIFFS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id)}
                aria-pressed={difficulty === d.id}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  difficulty === d.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setExam(false)}
            aria-pressed={!exam}
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              !exam
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent"
            }`}
          >
            Mode Santai (ada petunjuk)
          </button>
          <button
            type="button"
            onClick={() => setExam(true)}
            aria-pressed={exam}
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              exam
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent"
            }`}
          >
            Mode Ujian (berwaktu)
          </button>
          {exam && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Durasi
              <Input
                type="number"
                min={1}
                max={180}
                value={minutes}
                onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))}
                className="h-8 w-20"
              />
              menit
            </label>
          )}
        </div>

        <Input
          value={ownTopic}
          onChange={(e) => setOwnTopic(e.target.value)}
          placeholder={`Topik soal (opsional) — bidang: ${
            SUBJECTS.find((s) => s.id === subject)?.label ?? ""
          }`}
        />

        <Button onClick={() => void run()} disabled={busy} className="w-full gap-1.5">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
          {busy ? "Menyusun soal…" : "Mulai latihan"}
        </Button>
      </div>
    );
  }

  /* --------------------------- RESULT SCREEN ----------------------------- */
  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="text-center py-4">
          <Trophy className="w-8 h-8 mx-auto text-primary mb-2" />
          <div className="text-3xl font-bold tabular-nums">
            {score}/{questions.length}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Skor {pct} · waktu {mmss(elapsed)}
          </div>
          {retryRound > 1 && (
            <div className="text-[11px] text-muted-foreground mt-1">
              Ronde ke-{retryRound}
            </div>
          )}
          {saving && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Menyimpan…
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {wrongCount > 0 && (
            <Button
              variant="default"
              className="flex-1 min-w-35 gap-1.5"
              onClick={retryWrong}
            >
              <RotateCcw className="w-4 h-4" />
              Ulangi {wrongCount} soal salah
            </Button>
          )}
          <Button asChild variant="secondary" className="flex-1 min-w-35 gap-1.5">
            <Link to="/stem/analytics">
              <BarChart3 className="w-4 h-4" /> Lihat Analitik
            </Link>
          </Button>
          <Button
            variant="secondary"
            className="flex-1 min-w-35 gap-1.5"
            onClick={() => setQuestions(null)}
          >
            <Trophy className="w-4 h-4" /> Latihan baru
          </Button>
        </div>

        <div className="space-y-3">
          {questions.map((q, i) => {
            const ok = isCorrect(q, answers[i] ?? "");
            const isBookmarked = bookmarkedTexts.has(q.question);
            return (
              <details key={i} className="rounded-xl border border-border p-3">
                <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                  <span className={ok ? "text-primary" : "text-destructive"}>
                    {ok ? "✓" : "✗"}
                  </span>
                  <span className="flex-1">
                    Soal {i + 1} {q.topic ? `· ${q.topic}` : ""}
                  </span>
                  {isBookmarked && <BookmarkCheck className="w-3.5 h-3.5 text-primary" />}
                </summary>
                <div className="mt-2">
                  <MarkdownPreview source={q.question} />
                  <div className="text-xs text-muted-foreground mt-2">
                    Jawabanmu: <b>{answers[i] || "—"}</b> · Kunci: <b>{q.answer}</b>
                  </div>
                  <div className="mt-2 border-t border-border pt-2">
                    <MarkdownPreview source={q.solution || "_Tidak ada pembahasan._"} />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => void toggleBookmark(q)}
                      disabled={bookmarkBusy === q.question}
                    >
                      {isBookmarked ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5 text-primary" /> Tersimpan
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" /> Bookmark
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    );
  }

  /* ---------------------------- LIVE SCREEN ------------------------------ */
  const q = questions[idx]!;
  const given = answers[idx] ?? "";
  const hints = q.hints ?? [];
  const shown = hintLevel[idx] ?? 0;
  const isBookmarked = bookmarkedTexts.has(q.question);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <div className="text-xs font-medium text-muted-foreground">
          Soal {idx + 1} dari {questions.length}
          {q.topic ? ` · ${q.topic}` : ""}
          {retryRound > 1 ? ` · ronde ${retryRound}` : ""}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => void toggleBookmark(q)}
            disabled={bookmarkBusy === q.question}
            className="p-1 rounded hover:bg-accent transition-colors"
            aria-label={isBookmarked ? "Hapus bookmark" : "Simpan ke bookmark"}
            title={isBookmarked ? "Hapus bookmark" : "Bookmark soal"}
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-4 h-4 text-primary" />
            ) : (
              <Bookmark className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Timer className="w-3.5 h-3.5" />
            {exam ? mmss(left) : mmss(elapsed)}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setPaused((v) => !v)}
            title={paused ? "Lanjutkan waktu" : "Jeda waktu"}
            aria-label={paused ? "Lanjutkan waktu" : "Jeda waktu"}
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            onClick={() => void submitSession(false)}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Selesai"}
          </Button>
        </div>
      </div>

      {paused && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm text-center">
          Latihan dijeda — waktu berhenti. Tekan tombol putar untuk melanjutkan.
        </div>
      )}

      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-[width] duration-300"
          style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-[15px] leading-relaxed">
          <MarkdownPreview source={q.question} />
        </div>

        <div className="mt-3 space-y-2">
          {q.type === "mc" ? (
            q.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setAnswers((a) => ({ ...a, [idx]: opt }))}
                className={`w-full text-left rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                  given === opt ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                }`}
              >
                <MarkdownPreview source={opt} />
              </button>
            ))
          ) : (
            <Input
              value={given}
              onChange={(e) => setAnswers((a) => ({ ...a, [idx]: e.target.value }))}
              placeholder="Tulis jawaban berupa angka"
              inputMode="decimal"
            />
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!exam && hints.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs gap-1"
              disabled={shown >= hints.length}
              onClick={() => setHintLevel((h) => ({ ...h, [idx]: shown + 1 }))}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              {shown === 0
                ? "Butuh Petunjuk?"
                : shown >= hints.length
                  ? "Petunjuk habis"
                  : "Petunjuk lagi"}
            </Button>
          )}
          <ScratchpadDrawer />
          {!exam && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs"
              onClick={() => setRevealed((r) => ({ ...r, [idx]: true }))}
            >
              Lihat pembahasan
            </Button>
          )}
        </div>

        {!exam && shown > 0 && (
          <ol className="mt-3 space-y-1.5 text-sm list-decimal pl-5">
            {hints.slice(0, shown).map((h, i) => (
              <li key={i} className="text-muted-foreground">
                <MarkdownPreview source={h} />
              </li>
            ))}
          </ol>
        )}

        {!exam && revealed[idx] && (
          <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-1">Pembahasan</div>
            <MarkdownPreview source={q.solution || `**Jawaban: ${q.answer}**`} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          className="flex-1 gap-1"
          disabled={idx === 0}
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft className="w-4 h-4" /> Sebelumnya
        </Button>
        {idx === questions.length - 1 ? (
          <Button
            className="flex-1"
            onClick={() => void submitSession(false)}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" /> Menyimpan…
              </>
            ) : (
              "Kumpulkan"
            )}
          </Button>
        ) : (
          <Button className="flex-1 gap-1" onClick={() => setIdx((i) => i + 1)}>
            Berikutnya <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}