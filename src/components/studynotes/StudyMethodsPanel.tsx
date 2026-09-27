import { useMemo, useRef, useState } from "react";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Brain,
  Eye,
  EyeOff,
  Lightbulb,
  Columns3,
  CheckCircle2,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownPreview } from "@/components/studynotes/MarkdownPreview";
import { POMODORO_PRESETS, usePomodoro } from "@/lib/pomodoro";

type Props = {
  content: string;
  noteId: string;
  onAppend?: (markdown: string) => void;
};

/* ------------------------------ Pomodoro (global) ------------------------------ */

function Pomodoro() {
  const {
    presetId,
    setPresetId,
    phase,
    left,
    total,
    running,
    done,
    toggle,
    reset,
    switchPhase,
    phaseLabel,
    mmss,
  } = usePomodoro();

  const pct = total > 0 ? ((total - left) / total) * 100 : 0;
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Preset pomodoro">
        {POMODORO_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={presetId === p.id}
            onClick={() => setPresetId(p.id)}
            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              presetId === p.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-accent"
            }`}
          >
            {p.label} · {p.focus}/{p.short}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-[132px] h-[132px] shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r={R} className="stroke-muted" strokeWidth="8" fill="none" />
            <circle
              cx="60"
              cy="60"
              r={R}
              className={phase === "focus" ? "stroke-primary" : "stroke-emerald-500"}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C - (pct / 100) * C}
              style={{ transition: "stroke-dashoffset 0.4s linear" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div
              className="text-2xl font-semibold tabular-nums"
              role="timer"
              aria-live="off"
              aria-label={`${phaseLabel}, sisa ${mmss}`}
            >
              {mmss}
            </div>
          </div>
        </div>

        <div className="flex-1 w-full space-y-3 text-center sm:text-left">
          <div>
            <div className="text-sm font-medium">{phaseLabel}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Timer ini terus berjalan walau kamu pindah ke tab Preview, Edit, atau Latihan — bahkan
              setelah halaman dimuat ulang.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <Button onClick={toggle} className="gap-1">
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {running ? "Jeda" : "Mulai"}
            </Button>
            <Button variant="secondary" onClick={() => reset()} className="gap-1">
              <RotateCcw className="w-4 h-4" /> Ulang
            </Button>
            <Button variant="ghost" onClick={switchPhase} className="gap-1">
              <Repeat className="w-4 h-4" /> Ganti sesi
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center sm:justify-start">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> {done} sesi fokus selesai
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Blurting ------------------------------ */

const STOP = new Set(
  "yang dan atau dengan untuk pada dari ini itu adalah akan tidak juga dalam sebagai ke di ada bisa dapat agar oleh karena jika maka the and for with that this from are was you your".split(
    " "
  )
);

function keywords(text: string) {
  const words = text
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !STOP.has(w));
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([w]) => w);
}

function Blurting({ content, onAppend }: { content: string; onAppend?: (md: string) => void }) {
  const [draft, setDraft] = useState("");
  const [checked, setChecked] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const keys = useMemo(() => keywords(content), [content]);
  const lower = draft.toLowerCase();
  const hit = keys.filter((k) => lower.includes(k));
  const missed = keys.filter((k) => !lower.includes(k));
  const score = keys.length ? Math.round((hit.length / keys.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tutup catatan, lalu tulis semua yang kamu ingat tentang topik ini secepat mungkin. Setelah itu
        bandingkan dengan catatan aslinya untuk menemukan celah ingatanmu.
      </p>
      <Textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setChecked(false);
        }}
        placeholder="Tulis semua yang kamu ingat di sini..."
        aria-label="Tulis ingatanmu"
        className="min-h-[180px] font-[inherit] leading-relaxed"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setChecked(true)} disabled={!draft.trim()} className="gap-1">
          <Brain className="w-4 h-4" /> Bandingkan
        </Button>
        <Button variant="secondary" onClick={() => setShowSource((v) => !v)} className="gap-1">
          {showSource ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showSource ? "Sembunyikan catatan" : "Lihat catatan"}
        </Button>
        {checked && onAppend && (
          <Button
            variant="ghost"
            onClick={() =>
              onAppend(
                `\n\n## Blurting (${new Date().toLocaleDateString("id-ID")}) — skor ${score}%\n\n${draft}\n\n**Belum tersebut:** ${
                  missed.join(", ") || "—"
                }\n`
              )
            }
          >
            Simpan ke catatan
          </Button>
        )}
      </div>

      {checked && (
        <div className="rounded-lg border border-border p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium">Cakupan ingatan</div>
            <div className="text-sm font-semibold tabular-nums">{score}%</div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-[width] duration-500"
              style={{ width: `${score}%` }}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium mb-1.5 text-emerald-600 dark:text-emerald-400">
                Sudah kamu ingat ({hit.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {hit.length ? (
                  hit.map((k) => (
                    <span key={k} className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px]">
                      {k}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">Belum ada</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium mb-1.5 text-amber-600 dark:text-amber-400">
                Perlu diulang ({missed.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {missed.length ? (
                  missed.map((k) => (
                    <span key={k} className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px]">
                      {k}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">Semua tercakup 🎉</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSource && (
        <div className="rounded-lg border border-border p-4 max-h-72 overflow-y-auto bg-background">
          <MarkdownPreview source={content} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Feynman ------------------------------ */

const FEYNMAN_STEPS = [
  { t: "1. Tulis topiknya", d: "Sebut satu konsep yang ingin kamu kuasai." },
  { t: "2. Jelaskan seperti ke anak 12 tahun", d: "Tanpa istilah rumit, pakai bahasa sederhana." },
  { t: "3. Tandai bagian yang macet", d: "Bagian yang sulit dijelaskan = bagian yang belum kamu paham." },
  { t: "4. Sederhanakan & pakai analogi", d: "Ulang penjelasan sampai mengalir tanpa jeda." },
];

function Feynman({ onAppend }: { onAppend?: (md: string) => void }) {
  const [values, setValues] = useState<string[]>(["", "", "", ""]);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Metode Feynman: kamu benar-benar paham kalau bisa menjelaskannya dengan bahasa sederhana.
      </p>
      <ol className="space-y-3">
        {FEYNMAN_STEPS.map((s, i) => (
          <li key={s.t} className="rounded-lg border border-border p-3">
            <label className="block text-sm font-medium" htmlFor={`feynman-${i}`}>
              {s.t}
            </label>
            <div className="text-xs text-muted-foreground mt-0.5 mb-2">{s.d}</div>
            <Textarea
              id={`feynman-${i}`}
              value={values[i]}
              onChange={(e) =>
                setValues((v) => v.map((x, idx) => (idx === i ? e.target.value : x)))
              }
              className="min-h-[72px]"
              placeholder="Tulis di sini..."
            />
          </li>
        ))}
      </ol>
      {onAppend && (
        <Button
          variant="secondary"
          disabled={!values.some((v) => v.trim())}
          onClick={() =>
            onAppend(
              `\n\n## Penjelasan Feynman\n\n${FEYNMAN_STEPS.map(
                (s, i) => `**${s.t}**\n\n${values[i] || "_(kosong)_"}`
              ).join("\n\n")}\n`
            )
          }
          className="gap-1"
        >
          <Lightbulb className="w-4 h-4" /> Simpan ke catatan
        </Button>
      )}
    </div>
  );
}

/* ------------------------------ Cornell ------------------------------ */

function Cornell({ content, onAppend }: { content: string; onAppend?: (md: string) => void }) {
  const [cues, setCues] = useState("");
  const [summary, setSummary] = useState("");
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Catatan Cornell: kolom kiri untuk pertanyaan pemicu, kanan untuk isi catatan, bawah untuk
        rangkuman satu paragraf dengan bahasamu sendiri.
      </p>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div>
          <label htmlFor="cornell-cues" className="text-xs font-medium">
            Pertanyaan / kata pemicu
          </label>
          <Textarea
            id="cornell-cues"
            value={cues}
            onChange={(e) => setCues(e.target.value)}
            className="min-h-[200px] mt-1.5"
            placeholder="- Apa itu ...?&#10;- Kenapa ... penting?"
          />
        </div>
        <div className="rounded-lg border border-border p-3 max-h-[240px] overflow-y-auto bg-background">
          <MarkdownPreview source={content || "_Catatan masih kosong._"} />
        </div>
      </div>
      <div>
        <label htmlFor="cornell-summary" className="text-xs font-medium">
          Rangkuman dengan bahasamu sendiri
        </label>
        <Textarea
          id="cornell-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="min-h-[90px] mt-1.5"
          placeholder="Intinya adalah..."
        />
      </div>
      {onAppend && (
        <Button
          variant="secondary"
          disabled={!cues.trim() && !summary.trim()}
          onClick={() =>
            onAppend(`\n\n## Cornell\n\n**Pertanyaan pemicu**\n\n${cues}\n\n**Rangkumanku**\n\n${summary}\n`)
          }
          className="gap-1"
        >
          <Columns3 className="w-4 h-4" /> Simpan ke catatan
        </Button>
      )}
    </div>
  );
}

/* ------------------------------ Panel ------------------------------ */

export function StudyMethodsPanel({ content, onAppend }: Props) {
  const [tab, setTab] = useState("pomodoro");
  const topRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={topRef} className="p-4 sm:p-6 space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" /> Metode belajar
        </h2>
        <p className="text-sm text-muted-foreground">
          Pilih teknik belajar dan pakai langsung di atas catatan ini.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full h-auto flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="pomodoro" className="gap-1.5 text-xs sm:text-sm">
            <Timer className="w-3.5 h-3.5" /> Pomodoro
          </TabsTrigger>
          <TabsTrigger value="blurting" className="gap-1.5 text-xs sm:text-sm">
            <Brain className="w-3.5 h-3.5" /> Blurting
          </TabsTrigger>
          <TabsTrigger value="feynman" className="gap-1.5 text-xs sm:text-sm">
            <Lightbulb className="w-3.5 h-3.5" /> Feynman
          </TabsTrigger>
          <TabsTrigger value="cornell" className="gap-1.5 text-xs sm:text-sm">
            <Columns3 className="w-3.5 h-3.5" /> Cornell
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pomodoro" className="mt-4 rounded-xl border border-border p-4 sm:p-5">
          <Pomodoro />
        </TabsContent>
        <TabsContent value="blurting" className="mt-4 rounded-xl border border-border p-4 sm:p-5">
          <Blurting content={content} onAppend={onAppend} />
        </TabsContent>
        <TabsContent value="feynman" className="mt-4 rounded-xl border border-border p-4 sm:p-5">
          <Feynman onAppend={onAppend} />
        </TabsContent>
        <TabsContent value="cornell" className="mt-4 rounded-xl border border-border p-4 sm:p-5">
          <Cornell content={content} onAppend={onAppend} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
