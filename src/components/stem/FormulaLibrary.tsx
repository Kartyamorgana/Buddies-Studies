// src/components/stem/FormulaLibrary.tsx
import { useMemo, useState } from "react";
import { Check, Copy, Search, Sigma, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FORMULA_LIBRARY,
  FORMULA_SUBJECTS,
  type Formula,
  type FormulaSubject,
} from "@/lib/formula-library";
import { MarkdownPreview } from "@/components/studynotes/MarkdownPreview";
import { cn } from "@/lib/utils";

const INLINE_MD = "[&_.prose-note>*:first-child]:mt-0 [&_.prose-note>*:last-child]:mb-0";

type Filter = "all" | FormulaSubject;

function FormulaCard({ formula }: { formula: Formula }) {
  const [copied, setCopied] = useState(false);
  const [showVars, setShowVars] = useState(false);
  const meta = FORMULA_SUBJECTS.find((s) => s.id === formula.subject);

  const copy = () => {
    navigator.clipboard.writeText(`$$${formula.latex}$$`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-snug">{formula.name}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium">
              {meta?.short ?? "?"}
            </span>
            <span>·</span>
            <span>{formula.topic}</span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Salin rumus"
          className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
          onClick={copy}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className={cn("mt-2 overflow-x-auto text-[15px]", INLINE_MD)}>
        <MarkdownPreview source={`$$${formula.latex}$$`} />
      </div>

            <div className={cn("mt-2 text-xs text-muted-foreground leading-relaxed", INLINE_MD)}>
        <MarkdownPreview source={formula.description} />
      </div>

      {formula.tips && (
        <div
          className={cn(
            "mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[11px] text-amber-800 dark:text-amber-200 leading-snug",
            INLINE_MD,
          )}
        >
          <MarkdownPreview source={`💡 ${formula.tips}`} />
        </div>
      )}

      {formula.variables && formula.variables.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowVars((v) => !v)}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            {showVars ? "Sembunyikan" : "Lihat"} keterangan variabel
          </button>
          {showVars && (
            <dl className="mt-1.5 space-y-0.5 text-[11px]">
              {formula.variables.map((v) => (
                <div key={v.sym} className="flex gap-2">
                  <dt className="font-mono font-semibold text-foreground shrink-0">{v.sym}</dt>
                  <dd className="text-muted-foreground">{v.meaning}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}

export function FormulaLibrary() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FORMULA_LIBRARY.filter((f) => {
      if (filter !== "all" && f.subject !== filter) return false;
      if (!q) return true;
      const blob = [
        f.name,
        f.description,
        f.topic,
        f.latex,
        f.tips ?? "",
        ...(f.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [query, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Formula[]>();
    for (const f of filtered) {
      const key = `${f.subject}::${f.topic}`;
      const arr = map.get(key) ?? [];
      arr.push(f);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="flex flex-col h-full">
      {/* Search + Filter */}
      <div className="shrink-0 space-y-2 border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari rumus, topik, atau kata kunci…"
            className="pl-8 h-9 pr-8 bg-background"
          />
          {query && (
            <button
              type="button"
              aria-label="Bersihkan pencarian"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            Semua
          </FilterChip>
          {FORMULA_SUBJECTS.map((s) => (
            <FilterChip
              key={s.id}
              active={filter === s.id}
              onClick={() => setFilter(s.id)}
            >
              {s.short}
            </FilterChip>
          ))}
          <span className="ml-auto text-[10px] text-muted-foreground self-center">
            {filtered.length} rumus
          </span>
        </div>
      </div>

      {/* Result list */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div className="grid place-items-center py-12 text-center">
            <Sigma className="w-7 h-7 text-muted-foreground mb-2" />
            <div className="text-sm font-medium">Tidak ada rumus cocok</div>
            <div className="text-xs text-muted-foreground mt-1">
              Coba kata kunci lain atau ubah filter.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([key, formulas]) => {
              const [, topic] = key.split("::");
              return (
                <div key={key}>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {topic}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {formulas.map((f) => (
                      <FormulaCard key={f.id} formula={f} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "secondary"}
      onClick={onClick}
      className="h-7 text-[11px] rounded-full px-2.5"
    >
      {children}
    </Button>
  );
}