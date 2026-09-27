// src/components/stem/StemBookmarks.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bookmark,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownPreview } from "@/components/studynotes/MarkdownPreview";
import { deleteBookmark, fetchBookmarks } from "@/lib/stem-db";
import type { StemBookmarkRow } from "@/lib/stem-schema";
import { getCategoryMeta } from "@/lib/snbt-categories";

const INLINE_MD =
  "[&_.prose-note>*:first-child]:mt-0 [&_.prose-note>*:last-child]:mb-0";

export function StemBookmarks() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StemBookmarkRow[]>([]);
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBookmarks();
      setRows(data);
    } catch (e) {
      toast.error("Gagal memuat bookmark", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (subjectFilter !== "all" && r.subject !== subjectFilter) return false;
      if (!q) return true;
      const blob = [r.question_text, r.topic, r.solution].join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [rows, query, subjectFilter]);

  const remove = async (id: string) => {
    try {
      await deleteBookmark(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Bookmark dihapus");
    } catch (e) {
      toast.error("Gagal menghapus", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const subjects = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.subject);
    return [...set];
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            Soal Tersimpan
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Kumpulan soal yang kamu tandai untuk dipelajari ulang.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="h-8 gap-1" onClick={() => void load()}>
            <RefreshCw className="w-3.5 h-3.5" /> Segarkan
          </Button>
          <Button asChild size="sm" variant="ghost" className="h-8 gap-1">
            <Link to="/stem">
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari soal, topik, atau pembahasan…"
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

        {subjects.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={subjectFilter === "all" ? "default" : "secondary"}
              onClick={() => setSubjectFilter("all")}
              className="h-7 text-[11px] rounded-full px-2.5"
            >
              Semua
            </Button>
            {subjects.map((s) => {
              const meta = getCategoryMeta(s);
              return (
                <Button
                  key={s}
                  size="sm"
                  variant={subjectFilter === s ? "default" : "secondary"}
                  onClick={() => setSubjectFilter(s)}
                  className="h-7 text-[11px] rounded-full px-2.5"
                >
                  {meta.short}
                </Button>
              );
            })}
            <span className="ml-auto text-[10px] text-muted-foreground self-center">
              {filtered.length} dari {rows.length}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <div className="text-sm">Memuat bookmark…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <Bookmark className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <div className="text-sm font-medium">
            {rows.length === 0 ? "Belum ada soal tersimpan" : "Tidak ada hasil"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {rows.length === 0
              ? "Klik ikon bookmark di soal saat latihan untuk menyimpannya di sini."
              : `Coba kata kunci lain.`}
          </p>
          <Button asChild size="sm" className="mt-4 gap-1">
            <Link to="/stem">
              <ArrowLeft className="w-3.5 h-3.5" /> Mulai latihan
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const meta = getCategoryMeta(b.subject);
            return (
              <div key={b.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-[10px] font-semibold rounded-full border px-2 py-0.5 shrink-0 ${meta.chip}`}
                    >
                      {meta.short}
                    </span>
                    {b.topic && (
                      <span className="text-[11px] text-muted-foreground truncate">
                        {b.topic}
                      </span>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => void remove(b.id)}
                    aria-label="Hapus bookmark"
                    title="Hapus bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>

                <div className={`text-sm leading-relaxed ${INLINE_MD}`}>
                  <MarkdownPreview source={b.question_text} />
                </div>

                {b.options.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[13px]">
                    {b.options.map((opt, i) => (
                      <li
                        key={i}
                        className={`rounded-md border px-2.5 py-1.5 ${
                          opt.trim() === b.correct_answer.trim()
                            ? "border-primary/40 bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <MarkdownPreview source={opt} />
                      </li>
                    ))}
                  </ul>
                )}

                <details className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                    Pembahasan
                  </summary>
                  <div className="mt-2 text-sm">
                    <MarkdownPreview source={b.solution || "_Tidak ada pembahasan._"} />
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}