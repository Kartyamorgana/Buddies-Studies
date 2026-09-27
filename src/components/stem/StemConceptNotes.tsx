// src/components/stem/StemConceptNotes.tsx
import { useCallback, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BookmarkPlus,
  Check,
  ChevronDown,
  ClipboardCheck,
  Copy,
  GraduationCap,
  Layers,
  Lightbulb,
  Loader2,
  Notebook,
  Search,
  Sigma,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { FormulaLibrary } from "./FormulaLibrary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownPreview } from "@/components/studynotes/MarkdownPreview";
import {
  conceptNotesToMarkdown,
  generateStemConceptNotes,
  SUBJECTS,
  type StemConcept,
  type StemConceptFormula,
  type StemConceptNotesData,
  type SubjectId,
} from "@/lib/stem.functions";

/** Reset margin paragraf pertama & terakhir `prose-note` agar aman disisipkan inline. */
const INLINE_MD =
  "[&_.prose-note>*:first-child]:mt-0 [&_.prose-note>*:last-child]:mb-0";

function CopyLatexButton({ latex }: { latex: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Salin rumus"
      className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      onClick={() => {
        navigator.clipboard.writeText(`$${latex}$`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/** Satu kartu rumus — dipakai di dalam konsep yang punya banyak rumus. */
function FormulaCard({ formula, index }: { formula: StemConceptFormula; index: number }) {
  const hasLatex = !!formula.latex.trim();
  const label = formula.name?.trim() || `Rumus ${index + 1}`;

  return (
    <div className="rounded-xl border border-border bg-background/40 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold text-foreground/90">{label}</div>
        {hasLatex && <CopyLatexButton latex={formula.latex} />}
      </div>

      {hasLatex && (
        <div className={`overflow-x-auto text-[15px] leading-tight ${INLINE_MD}`}>
          <MarkdownPreview source={`$$${formula.latex}$$`} />
        </div>
      )}

      {formula.description && (
        <div
          className={`text-xs text-muted-foreground leading-snug border-t border-border/60 pt-2 ${INLINE_MD}`}
        >
          <MarkdownPreview source={formula.description} />
        </div>
      )}

      {formula.when && (
        <div className={`text-xs leading-snug ${INLINE_MD}`}>
          <span className="font-medium text-foreground">Kapan dipakai: </span>
          <MarkdownPreview source={formula.when} />
        </div>
      )}
    </div>
  );
}

/** Daftar rumus bawaan (Matematika · Fisika · Kimia · Biologi) yang bisa dicari. */
function BuiltInFormulas() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-accent/50"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
          <Sigma className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Rumus bawaan SNBT</div>
          <div className="text-[11px] text-muted-foreground">
            Matematika · Fisika · Kimia · Biologi — bisa dicari &amp; disalin
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="h-[65vh] max-h-[560px] border-t border-border">
          <FormulaLibrary />
        </div>
      )}
    </div>
  );
}

function GlossaryItem({ term, meaning }: { term: string; meaning: string }) {
  return (
    <div className="py-2 border-b border-border/50 last:border-0">
      <dt className={`text-[13px] font-semibold text-foreground leading-snug ${INLINE_MD}`}>
        <MarkdownPreview source={term} />
      </dt>
      <dd className={`mt-0.5 text-xs text-muted-foreground leading-snug ${INLINE_MD}`}>
        <MarkdownPreview source={meaning} />
      </dd>
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: typeof Layers;
  children: React.ReactNode;
}) {
  return (
    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5" /> {children}
    </div>
  );
}

export function StemConceptNotes({
  subject,
  material,
  topic,
  onSaveNote,
}: {
  subject: SubjectId;
  material?: string;
  topic?: string;
  onSaveNote: (title: string, markdown: string) => void;
}) {
  const gen = useServerFn(generateStemConceptNotes);
  const [ownTopic, setOwnTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StemConceptNotesData | null>(null);
  const [query, setQuery] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);

  const run = useCallback(async () => {
    const t = ownTopic.trim() || topic?.trim();
    if (!t && !material?.trim()) {
      toast.error("Tulis topik atau analisis materi dulu");
      return;
    }
    setBusy(true);
    try {
      const res = await gen({
        data: {
          subject,
          topic: t || undefined,
          // Naikkan window slice ke 300k (server akan chunk otomatis).
          material: material?.trim() ? material.slice(0, 300000) : undefined,
        },
      });
      setResult(res);
      setQuery("");
      toast.success("Catatan konsep & rumus siap");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat catatan konsep");
    } finally {
      setBusy(false);
    }
  }, [ownTopic, topic, material, subject, gen]);

  const totalFormulas = useMemo(
    () => result?.concepts.reduce((n, c) => n + c.formulas.length, 0) ?? 0,
    [result],
  );
  const totalExamples = useMemo(
    () => result?.concepts.filter((c) => c.example?.question).length ?? 0,
    [result],
  );

  const filtered = useMemo(() => {
    if (!result) return [];
    const q = query.trim().toLowerCase();
    if (!q) return result.concepts;
    return result.concepts.filter((c) => {
      const blob = [
        c.name,
        c.definition,
        c.explanation,
        ...c.keyPoints,
        ...c.steps,
        c.example?.question ?? "",
        c.example?.solution ?? "",
        c.example?.answer ?? "",
        ...c.formulas.flatMap((f) => [f.name, f.latex, f.description, f.when]),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [result, query]);

  const copyAll = useCallback(async () => {
    if (!result) return;
    await navigator.clipboard.writeText(conceptNotesToMarkdown(result));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
    toast.success("Markdown disalin");
  }, [result]);

  /* ------------------------------- FORM ----------------------------------- */
  if (!result) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <Notebook className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm">Catatan Konsep &amp; Rumus</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ekstraksi <b>lengkap</b>: setiap konsep dan setiap rumus dari materi akan
                didaftarkan — termasuk multi-rumus per konsep, langkah pakai, dan contoh soal.
              </p>
            </div>
          </div>

          <Input
            value={ownTopic}
            onChange={(e) => setOwnTopic(e.target.value)}
            placeholder={`Topik catatan (opsional) — bidang: ${
              SUBJECTS.find((s) => s.id === subject)?.label ?? ""
            }`}
          />

          <Button onClick={run} disabled={busy} className="w-full gap-1.5">
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {busy ? "Menyusun catatan konsep…" : "Buat catatan konsep & rumus"}
          </Button>

          <p className="text-[11px] text-muted-foreground">
            Tip: setelah analisis materi di tab sebelumnya, catatan ini akan otomatis memakai
            materi tersebut sebagai acuan — termasuk contoh soalnya. Materi besar diproses
            per-bagian lalu digabung agar tidak ada konsep/rumus yang hilang.
          </p>
        </div>

        <BuiltInFormulas />
      </div>
    );
  }

  /* ------------------------------- HASIL ---------------------------------- */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight wrap-break-word">{result.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> {result.concepts.length} konsep
              </span>
              <span className="inline-flex items-center gap-1">
                <Sigma className="w-3.5 h-3.5" /> {totalFormulas} rumus
              </span>
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" /> {totalExamples} contoh soal
              </span>
              {result.pitfalls.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <TriangleAlert className="w-3.5 h-3.5" /> {result.pitfalls.length} jebakan
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 shrink-0">
            <Button size="sm" variant="secondary" className="h-8 text-xs gap-1" onClick={copyAll}>
              {copiedAll ? (
                <ClipboardCheck className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedAll ? "Tersalin" : "Salin MD"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs gap-1"
              onClick={() => onSaveNote(result.title, conceptNotesToMarkdown(result))}
            >
              <BookmarkPlus className="w-3.5 h-3.5" /> Simpan ke Notes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setResult(null)}
            >
              Reset
            </Button>
          </div>
        </div>

        {result.overview && (
          <div
            className={`mt-3 text-sm text-foreground/90 border-l-4 border-primary/40 pl-3 ${INLINE_MD}`}
          >
            <MarkdownPreview source={result.overview} />
          </div>
        )}

        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari konsep, rumus, langkah, atau contoh soal…"
            className="pl-8 h-9 bg-background"
          />
        </div>
      </div>

      {/* Konsep */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Tidak ada hasil untuk "{query}"
          </div>
        )}

        {filtered.map((c, i) => (
          <ConceptSection key={`${c.name}-${i}`} concept={c} index={i} />
        ))}
      </div>

      {/* Kesalahan umum */}
      {result.pitfalls.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TriangleAlert className="w-4 h-4 text-destructive" /> Kesalahan umum
          </div>
          <ul className="space-y-1.5 text-sm leading-relaxed">
            {result.pitfalls.map((p, i) => (
              <li key={i} className="grid grid-cols-[auto_1fr] gap-2 leading-relaxed">
                <span className="text-destructive select-none" aria-hidden="true">
                  •
                </span>
                <div className={`min-w-0 ${INLINE_MD}`}>
                  <MarkdownPreview source={p} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Glosarium */}
      {result.quickRefs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm font-semibold mb-3 flex items-center gap-2">📖 Glosarium</div>
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {result.quickRefs.map((q, i) => (
              <GlossaryItem key={i} term={q.term} meaning={q.meaning} />
            ))}
          </dl>
        </div>
      )}

      <BuiltInFormulas />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-komponen: satu konsep (dengan multi-rumus)                            */
/* -------------------------------------------------------------------------- */

function ConceptSection({ concept: c, index }: { concept: StemConcept; index: number }) {
  const formulasCount = c.formulas.length;
  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="border-l-4 border-primary bg-muted/40 px-4 py-2.5 flex items-center gap-2 flex-wrap">
        <h3 className="font-semibold text-[15px] tracking-tight">
          {index + 1}. {c.name}
        </h3>
        {formulasCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">
            <Sigma className="w-3 h-3" /> {formulasCount} rumus
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {c.definition && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <SectionLabel icon={Notebook}>Pengertian</SectionLabel>
            <div className={`text-sm leading-relaxed ${INLINE_MD}`}>
              <MarkdownPreview source={c.definition} />
            </div>
          </div>
        )}

        {c.explanation && (
          <div className={`text-sm text-foreground/90 leading-relaxed ${INLINE_MD}`}>
            <MarkdownPreview source={c.explanation} />
          </div>
        )}

        {c.keyPoints.length > 0 && (
          <div>
            <SectionLabel icon={Lightbulb}>Poin penting</SectionLabel>
            <ul className="space-y-1.5 text-sm leading-relaxed">
              {c.keyPoints.map((k, j) => (
                <li key={j} className="grid grid-cols-[auto_1fr] gap-2 leading-relaxed">
                  <span className="text-primary select-none" aria-hidden="true">
                    •
                  </span>
                  <div className={`min-w-0 ${INLINE_MD}`}>
                    <MarkdownPreview source={k} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {formulasCount > 0 && (
          <div>
            <SectionLabel icon={Sigma}>Rumus &amp; penjelasan</SectionLabel>
            <div className="space-y-2">
              {c.formulas.map((f, fi) => (
                <FormulaCard key={fi} formula={f} index={fi} />
              ))}
            </div>
          </div>
        )}

        {c.steps.length > 0 && (
          <div>
            <SectionLabel icon={Layers}>Langkah penggunaan dalam soal</SectionLabel>
            <ol className="space-y-1.5 text-sm list-decimal pl-5">
              {c.steps.map((s, j) => (
                <li key={j} className="leading-relaxed text-foreground/90">
                  <div className={`min-w-0 ${INLINE_MD}`}>
                    <MarkdownPreview source={s} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {c.example?.question && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-3">
            <SectionLabel icon={GraduationCap}>Contoh soal</SectionLabel>
            <div className={`text-sm leading-relaxed ${INLINE_MD}`}>
              <MarkdownPreview source={c.example.question} />
            </div>
            {c.example.solution && (
              <div
                className={`text-sm leading-relaxed border-t border-primary/20 pt-2 ${INLINE_MD}`}
              >
                <MarkdownPreview source={c.example.solution} />
              </div>
            )}
            {c.example.answer && (
              <div className="text-sm font-medium inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5">
                <span className="text-primary font-semibold">Jawaban:</span>
                <MarkdownPreview source={c.example.answer} />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}