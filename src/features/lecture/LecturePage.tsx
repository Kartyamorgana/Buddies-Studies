// Halaman Transkrip Kuliah: rekam/unggah audio -> transkrip -> catatan, soal, podcast, puzzle.
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  FileAudio,
  Headphones,
  Loader2,
  Mic,
  Puzzle,
  Save,
  Square,
  Trash2,
  Trophy,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VarkHeader } from "@/components/vark/VarkHeader";
import { MarkdownPreview } from "@/components/studynotes/MarkdownPreview";
import { transcribeAudio } from "@/lib/ingest.functions";
import { transcriptToNote, transcriptToQuiz } from "@/lib/lecture.functions";
import { generatePodcast, generateStepPuzzle } from "@/lib/vark.functions";
type PodcastLike = {
  title: string;
  summary?: string;
  lines: { name: string; text: string }[];
};
type PuzzleLike = {
  title: string;
  prompt?: string;
  steps: { id: string; text: string; explain?: string }[];
};
import {
  deleteTranscript,
  fetchTranscripts,
  saveTranscript,
  type TranscriptRow,
} from "./db";
import { supabase } from "@/integrations/supabase/client";

type QuizData = {
  topic: string;
  questions: {
    question_text: string;
    options: string[];
    correct_answer: string;
    hints: string[];
    solution: string;
  }[];
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function fileToBase64(file: Blob) {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) {
    bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export function LecturePage() {
  const doTranscribe = useServerFn(transcribeAudio);
  const toNote = useServerFn(transcriptToNote);
  const toQuiz = useServerFn(transcriptToQuiz);
  const toPodcast = useServerFn(generatePodcast);
  const toPuzzle = useServerFn(generateStepPuzzle);

  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [history, setHistory] = useState<TranscriptRow[]>([]);

  const [note, setNote] = useState<{ title: string; content: string } | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [podcast, setPodcast] = useState<PodcastLike | null>(null);
  const [puzzle, setPuzzle] = useState<PuzzleLike | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await fetchTranscripts());
    } catch (e) {
      toast.error("Gagal memuat riwayat", { description: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setElapsed((Date.now() - startedRef.current) / 1000), 500);
    return () => clearInterval(id);
  }, [recording]);

  const runTranscribe = useCallback(
    async (blob: Blob, filename: string, kind: "record" | "upload", durationSec: number) => {
      setBusy("transcribe");
      try {
        const base64 = await fileToBase64(blob);
        const res = await doTranscribe({
          data: { base64, mime: blob.type || "audio/webm", filename },
        });
        setTranscript(res.text);
        const autoTitle = title.trim() || filename.replace(/\.[^.]+$/, "").slice(0, 120);
        setTitle(autoTitle);
        try {
          await saveTranscript({
            title: autoTitle || "Rekaman kuliah",
            transcript: res.text,
            sourceKind: kind,
            durationSec,
          });
          await loadHistory();
        } catch {
          /* transkrip tetap tampil walau gagal disimpan */
        }
        toast.success("Transkrip siap");
      } catch (e) {
        toast.error("Gagal membuat transkrip", { description: (e as Error).message });
      } finally {
        setBusy(null);
      }
    },
    [doTranscribe, loadHistory, title],
  );

  const startRec = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Pilih format yang didukung perangkat: Chrome/Android -> webm/ogg,
      // iPhone/Safari -> mp4/aac. Tanpa ini rekaman di iOS gagal diputar/ditranskrip.
      const mime = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/aac",
        "audio/ogg;codecs=opus",
      ].find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m));
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const dur = (Date.now() - startedRef.current) / 1000;
        setRecording(false);
        if (blob.size < 2000) {
          toast.error("Rekaman terlalu pendek");
          return;
        }
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        void runTranscribe(blob, `rekaman-kuliah.${ext}`, "record", dur);
      };
      startedRef.current = Date.now();
      setElapsed(0);
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch {
      toast.error("Tidak bisa mengakses mikrofon. Izinkan akses lalu coba lagi.");
    }
  }, [runTranscribe]);

  const stopRec = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
  }, []);

  const onUpload = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) {
        toast.error("Ukuran audio maksimal 25 MB");
        return;
      }
      void runTranscribe(file, file.name, "upload", 0);
    },
    [runTranscribe],
  );

  const ready = transcript.trim().length >= 30;

  const guard = () => {
    if (!ready) {
      toast.error("Transkrip masih terlalu pendek");
      return false;
    }
    return true;
  };

  const makeNote = useCallback(async () => {
    if (!guard()) return;
    setBusy("note");
    try {
      setNote(await toNote({ data: { transcript, title: title.slice(0, 200) } }));
      toast.success("Catatan siap");
    } catch (e) {
      toast.error("Gagal membuat catatan", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }, [toNote, transcript, title, ready]);

  const saveNote = useCallback(async () => {
    if (!note) return;
    const { error } = await supabase
      .from("notes")
      .insert({ title: note.title, content: note.content, folder_id: null });
    if (error) toast.error("Gagal menyimpan ke catatan", { description: error.message });
    else toast.success("Tersimpan di Catatan");
  }, [note]);

  const makeQuiz = useCallback(async () => {
    if (!guard()) return;
    setBusy("quiz");
    try {
      const res = await toQuiz({ data: { transcript, count: 6 } });
      setQuiz(res as QuizData);
      setAnswers({});
      toast.success("Soal latihan siap");
    } catch (e) {
      toast.error("Gagal membuat soal", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }, [toQuiz, transcript, ready]);

  const makePodcast = useCallback(async () => {
    if (!guard()) return;
    setBusy("podcast");
    try {
      setPodcast(await toPodcast({ data: { topic: title, material: transcript.slice(0, 60000) } }));
      toast.success("Naskah podcast siap");
    } catch (e) {
      toast.error("Gagal membuat podcast", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }, [toPodcast, transcript, title, ready]);

  const makePuzzle = useCallback(async () => {
    if (!guard()) return;
    setBusy("puzzle");
    try {
      setPuzzle(await toPuzzle({ data: { topic: title, material: transcript.slice(0, 60000) } }));
      toast.success("Puzzle langkah siap");
    } catch (e) {
      toast.error("Gagal membuat puzzle", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }, [toPuzzle, transcript, title, ready]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <VarkHeader
        icon={<Mic className="w-4 h-4" />}
        title="Transkrip Kuliah"
        subtitle="Rekam penjelasan guru, ubah jadi catatan dan soal"
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full p-4 space-y-4">
          {/* Perekam */}
          <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm">Rekam atau unggah audio</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Rekam langsung dari mikrofon, atau unggah file audio (maks 25 MB).
                </p>
              </div>
            </div>

            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul rekaman (mis. Kalkulus — Turunan Parsial)"
            />

            <div className="flex flex-wrap gap-2">
              {recording ? (
                <Button onClick={stopRec} variant="destructive" className="gap-1.5">
                  <Square className="w-4 h-4" /> Stop · {fmt(elapsed)}
                </Button>
              ) : (
                <Button onClick={startRec} disabled={!!busy} className="gap-1.5">
                  <Mic className="w-4 h-4" /> Mulai rekam
                </Button>
              )}

              <Button asChild variant="secondary" className="gap-1.5" disabled={!!busy}>
                <label>
                  <FileAudio className="w-4 h-4" /> Unggah audio
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => onUpload(e.target.files?.[0])}
                  />
                </label>
              </Button>

              {busy === "transcribe" && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyalin audio…
                </span>
              )}
            </div>
          </section>

          {/* Transkrip */}
          <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="font-semibold text-sm">Transkrip</div>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Hasil transkrip muncul di sini — kamu juga bisa menempel teks sendiri."
              className="min-h-40 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={makeNote} disabled={!!busy || !ready} className="gap-1.5" size="sm">
                {busy === "note" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Jadi catatan
              </Button>
              <Button onClick={makeQuiz} disabled={!!busy || !ready} variant="secondary" size="sm" className="gap-1.5">
                {busy === "quiz" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                Soal latihan
              </Button>
              <Button onClick={makePodcast} disabled={!!busy || !ready} variant="secondary" size="sm" className="gap-1.5">
                {busy === "podcast" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Headphones className="w-4 h-4" />}
                Naskah podcast
              </Button>
              <Button onClick={makePuzzle} disabled={!!busy || !ready} variant="secondary" size="sm" className="gap-1.5">
                {busy === "puzzle" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Puzzle className="w-4 h-4" />}
                Puzzle langkah
              </Button>
            </div>
          </section>

          {/* Catatan */}
          {note && (
            <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-sm flex-1 min-w-0 truncate">{note.title}</div>
                <Button size="sm" variant="secondary" className="gap-1.5" onClick={saveNote}>
                  <Save className="w-4 h-4" /> Simpan ke Catatan
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setNote(null)} aria-label="Hapus hasil catatan">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <MarkdownPreview source={note.content} />
            </section>
          )}

          {/* Soal */}
          {quiz && (
            <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-sm flex-1">Soal latihan · {quiz.topic || title}</div>
                <Button size="sm" variant="ghost" onClick={() => setQuiz(null)} aria-label="Hapus soal">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {quiz.questions.map((q, i) => {
                const picked = answers[i];
                return (
                  <div key={i} className="space-y-2 border-b border-border/60 last:border-0 pb-3 last:pb-0">
                    <div className="text-sm font-medium">
                      {i + 1}. {q.question_text}
                    </div>
                    <div className="grid gap-1.5">
                      {q.options.map((opt) => {
                        const chosen = picked === opt;
                        const correct = opt === q.correct_answer;
                        const cls = !picked
                          ? "border-border hover:bg-accent"
                          : correct
                            ? "border-primary bg-primary/10"
                            : chosen
                              ? "border-destructive bg-destructive/10"
                              : "border-border opacity-70";
                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={!!picked}
                            onClick={() => setAnswers((a) => ({ ...a, [i]: opt }))}
                            className={`text-left text-sm rounded-lg border px-3 py-2 transition-colors ${cls}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {picked && q.solution && (
                      <p className="text-xs text-muted-foreground">{q.solution}</p>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {/* Podcast */}
          {podcast && (
            <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-sm flex-1 min-w-0 truncate">{podcast.title}</div>
                <Button size="sm" variant="ghost" onClick={() => setPodcast(null)} aria-label="Hapus naskah">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{podcast.summary}</p>
              <div className="space-y-1.5">
                {podcast.lines.map((l, i) => (
                  <p key={i} className="text-sm">
                    <span className="font-semibold">{l.name}: </span>
                    {l.text}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* Puzzle */}
          {puzzle && (
            <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-sm flex-1 min-w-0 truncate">{puzzle.title}</div>
                <Button size="sm" variant="ghost" onClick={() => setPuzzle(null)} aria-label="Hapus puzzle">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{puzzle.prompt}</p>
              <ol className="list-decimal pl-5 space-y-1.5">
                {puzzle.steps.map((s) => (
                  <li key={s.id} className="text-sm">
                    {s.text}
                    {s.explain && (
                      <span className="block text-xs text-muted-foreground">{s.explain}</span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Riwayat */}
          {history.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="font-semibold text-sm">Riwayat transkrip</div>
              {history.map((h) => (
                <div key={h.id} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left"
                    onClick={() => {
                      setTitle(h.title);
                      setTranscript(h.transcript);
                      toast.success("Transkrip dimuat");
                    }}
                  >
                    <div className="text-sm truncate">{h.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(h.created_at).toLocaleString("id-ID")} ·{" "}
                      {h.source_kind === "record" ? "rekaman" : "unggahan"}
                      {h.duration_sec ? ` · ${fmt(h.duration_sec)}` : ""}
                    </div>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Hapus transkrip"
                    onClick={async () => {
                      try {
                        await deleteTranscript(h.id);
                        await loadHistory();
                      } catch (e) {
                        toast.error("Gagal menghapus", { description: (e as Error).message });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </section>
          )}
        </div>
      </main>

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
