// src/components/vark/AuditoryStudioPage.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Headphones,
  Loader2,
  MessageCircleQuestion,
  Mic,
  Pause,
  Play,
  Save,
  SkipForward,
  Square,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VarkHeader } from "./VarkHeader";
import { VarkSourcePicker, type VarkSource } from "./VarkSourcePicker";
import { askHost, generatePodcast } from "@/lib/vark.functions";
import { deletePodcast, fetchPodcasts, savePodcast } from "@/lib/vark-db";
import type { PodcastRow, PodcastScript } from "@/lib/vark-schema";

const RATES = [0.75, 1, 1.25, 1.5] as const;

export function AuditoryStudioPage() {
  const [source, setSource] = useState<VarkSource | null>(null);
  const [busy, setBusy] = useState(false);
  const [script, setScript] = useState<PodcastScript | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState<number>(1);
  const [history, setHistory] = useState<PodcastRow[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const rateRef = useRef(rate);
  rateRef.current = rate;
  const idxRef = useRef(0);
  idxRef.current = idx;
  const scriptRef = useRef<PodcastScript | null>(null);
  scriptRef.current = script;
  const stoppedRef = useRef(false);

  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await fetchPodcasts());
    } catch (e) {
      toast.error("Gagal memuat riwayat", { description: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    void loadHistory();
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [loadHistory]);

  const speakFrom = useCallback(
    (start: number) => {
      const s = scriptRef.current;
      if (!s || !supported) return;
      stoppedRef.current = false;
      window.speechSynthesis.cancel();
      setPlaying(true);

      const speakOne = (i: number) => {
        if (stoppedRef.current) return;
        const line = s.lines[i];
        if (!line) {
          setPlaying(false);
          return;
        }
        setIdx(i);
        const u = new SpeechSynthesisUtterance(line.text);
        u.lang = "id-ID";
        u.rate = rateRef.current;
        u.pitch = line.speaker === "A" ? 1.12 : 0.9;
        u.onend = () => {
          if (!stoppedRef.current) speakOne(i + 1);
        };
        u.onerror = () => setPlaying(false);
        window.speechSynthesis.speak(u);
      };
      speakOne(start);
    },
    [supported],
  );

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (supported) window.speechSynthesis.cancel();
    setPlaying(false);
  }, [supported]);

  const generate = async () => {
    if (!source) {
      toast.error("Pilih sumber materi dulu");
      return;
    }
    setBusy(true);
    stop();
    setAnswer(null);
    try {
      const raw = await generatePodcast({
        data: { topic: source.topic, material: source.material },
      });
      const s: PodcastScript = { ...raw, summary: raw.summary ?? "" };
      setScript(s);
      setIdx(0);
      setSavedId(null);
      const row = await savePodcast({
        title: s.title,
        source_kind: source.kind,
        source_ref: source.ref,
        material: source.material.slice(0, 100000),
        script: s,
      });
      setSavedId(row.id);
      await loadHistory();
      toast.success("Podcast siap diputar", { description: s.title });
    } catch (e) {
      toast.error("Gagal membuat podcast", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const ask = async () => {
    const q = question.trim();
    if (!q || !script) return;
    setAsking(true);
    if (playing) stop();
    try {
      const ctx = script.lines
        .slice(Math.max(0, idx - 2), idx + 1)
        .map((l) => `${l.name}: ${l.text}`)
        .join("\n");
      const res = await askHost({
        data: {
          question: q,
          topic: source?.topic ?? script.title,
          material: (source?.material ?? "").slice(0, 40000),
          context: ctx,
        },
      });
      setAnswer(res.answer);
      setQuestion("");
      if (supported) {
        const u = new SpeechSynthesisUtterance(res.answer);
        u.lang = "id-ID";
        u.rate = rate;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {
      toast.error("Gagal bertanya", { description: (e as Error).message });
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
      <VarkHeader
        icon={<Headphones className="w-4 h-4" />}
        title="Auditory Studio"
        subtitle="Podcast belajar interaktif dua pembawa acara"
      />

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-4xl w-full p-3 sm:p-5 space-y-4">
          <VarkSourcePicker value={source} onChange={setSource} />

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void generate()} disabled={busy || !source} className="gap-1.5">
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              Buat podcast
            </Button>
            {savedId && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Save className="w-3 h-3" /> Tersimpan di riwayatmu
              </span>
            )}
          </div>

          {!supported && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs">
              Peramban ini belum mendukung pembacaan suara. Transkrip tetap bisa dibaca.
            </div>
          )}

          {script && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
              <div>
                <div className="font-semibold text-sm">{script.title}</div>
                {script.summary && (
                  <p className="text-xs text-muted-foreground mt-1">{script.summary}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {playing ? (
                  <>
                    <Button size="sm" variant="secondary" className="gap-1.5" onClick={stop}>
                      <Pause className="w-3.5 h-3.5" /> Jeda
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5"
                      onClick={() => speakFrom(Math.min(idx + 1, script.lines.length - 1))}
                    >
                      <SkipForward className="w-3.5 h-3.5" /> Lewati
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={!supported}
                    onClick={() => speakFrom(idx)}
                  >
                    <Play className="w-3.5 h-3.5" /> Putar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5"
                  onClick={() => {
                    stop();
                    setIdx(0);
                  }}
                >
                  <Square className="w-3.5 h-3.5" /> Dari awal
                </Button>

                <div className="flex items-center gap-1 ml-auto">
                  {RATES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRate(r);
                        rateRef.current = r;
                        if (playing) speakFrom(idxRef.current);
                      }}
                      className={`rounded-md px-2 py-1 text-[11px] border transition-colors ${
                        rate === r
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {r}x
                    </button>
                  ))}
                </div>
              </div>

              <ol className="space-y-2">
                {script.lines.map((l, i) => (
                  <li
                    key={i}
                    className={`rounded-xl border p-3 text-sm transition-colors ${
                      i === idx
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background/40"
                    }`}
                  >
                    <button
                      type="button"
                      className="text-left w-full"
                      onClick={() => speakFrom(i)}
                      title="Putar dari baris ini"
                    >
                      <span
                        className={`text-[11px] font-semibold ${
                          l.speaker === "A" ? "text-primary" : "text-emerald-500"
                        }`}
                      >
                        {l.name}
                      </span>
                      <p className="mt-1 leading-relaxed">{l.text}</p>
                    </button>
                  </li>
                ))}
              </ol>

              <div className="rounded-xl border border-border p-3 space-y-2">
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <MessageCircleQuestion className="w-3.5 h-3.5" /> Jeda &amp; tanya pembawa acara
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void ask();
                    }}
                    placeholder="Mis. Kenapa bagian tadi bisa begitu?"
                    className="text-sm"
                  />
                  <Button size="sm" onClick={() => void ask()} disabled={asking || !question.trim()}>
                    {asking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Tanya"}
                  </Button>
                </div>
                {answer && (
                  <div className="rounded-lg bg-muted p-3 text-sm leading-relaxed">
                    <span className="text-[11px] font-semibold text-primary">Rani</span>
                    <p className="mt-1">{answer}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-sm font-semibold mb-2">Riwayat podcast</div>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Belum ada podcast. Buat yang pertama di atas.
              </p>
            ) : (
              <ul className="space-y-2">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-2 rounded-xl border border-border p-2.5"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        stop();
                        setScript(h.script);
                        setIdx(0);
                        setSavedId(h.id);
                        setSource({
                          kind: "text",
                          ref: h.source_ref,
                          topic: h.title,
                          material: h.material,
                        });
                        toast.info("Podcast dimuat", { description: h.title });
                      }}
                    >
                      <div className="text-sm truncate">{h.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(h.created_at).toLocaleString("id-ID")} ·{" "}
                        {h.script.lines?.length ?? 0} baris
                      </div>
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      title="Hapus"
                      onClick={async () => {
                        try {
                          await deletePodcast(h.id);
                          await loadHistory();
                        } catch (e) {
                          toast.error("Gagal menghapus", {
                            description: (e as Error).message,
                          });
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
