// Riwayat & analitik latihan dari catatan (mata pelajaran diisi manual pengguna).
import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, ChevronDown, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteNoteGameSession,
  fetchNoteGameSessions,
  updateNoteGameSubject,
  type NoteGameRow,
} from "@/lib/note-games-db";

const TYPE_LABEL: Record<string, string> = {
  quiz: "Kuis",
  flashcards: "Flashcard",
  matching: "Cocokkan",
  blanks: "Rumpang",
  mixed: "Campuran",
};

function fmtDur(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, "0")}d`;
}

export function NoteGameHistory({ refreshKey = 0 }: { refreshKey?: number }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NoteGameRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchNoteGameSessions());
    } catch (e) {
      toast.error("Gagal memuat riwayat", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load, refreshKey]);

  const stats = useMemo(() => {
    if (!rows.length) return null;
    const avg = rows.reduce((a, r) => a + Number(r.score), 0) / rows.length;
    const time = rows.reduce((a, r) => a + r.duration_sec, 0);
    const bySubject = new Map<string, { n: number; total: number }>();
    for (const r of rows) {
      const cur = bySubject.get(r.subject) ?? { n: 0, total: 0 };
      cur.n += 1;
      cur.total += Number(r.score);
      bySubject.set(r.subject, cur);
    }
    const subjects = [...bySubject.entries()]
      .map(([subject, v]) => ({ subject, n: v.n, avg: v.total / v.n }))
      .sort((a, b) => b.n - a.n);
    return { avg, time, subjects, count: rows.length };
  }, [rows]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-accent/50"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Riwayat &amp; analitik latihan</div>
          <div className="text-[11px] text-muted-foreground">
            Hasil latihan catatan, dikelompokkan per mata pelajaran
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat…
            </div>
          )}

          {!loading && !rows.length && (
            <p className="text-xs text-muted-foreground">
              Belum ada hasil. Selesaikan satu latihan lalu simpan hasilnya.
            </p>
          )}

          {stats && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-border p-2.5">
                  <div className="text-[11px] text-muted-foreground">Sesi</div>
                  <div className="text-lg font-semibold tabular-nums">{stats.count}</div>
                </div>
                <div className="rounded-lg border border-border p-2.5">
                  <div className="text-[11px] text-muted-foreground">Rata-rata skor</div>
                  <div className="text-lg font-semibold tabular-nums">{stats.avg.toFixed(1)}%</div>
                </div>
                <div className="rounded-lg border border-border p-2.5">
                  <div className="text-[11px] text-muted-foreground">Total waktu</div>
                  <div className="text-lg font-semibold tabular-nums">{fmtDur(stats.time)}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium">Per mata pelajaran</div>
                {stats.subjects.map((s) => (
                  <div key={s.subject} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="truncate">{s.subject}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {s.avg.toFixed(0)}% · {s.n} sesi
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, s.avg)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium">Riwayat sesi</div>
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs truncate">{r.note_title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.subject} · {TYPE_LABEL[r.game_type] ?? r.game_type} · {r.correct_count}/
                        {r.total_items} · {Number(r.score).toFixed(0)}%
                        {r.timed ? " · berwaktu" : ""} ·{" "}
                        {new Date(r.created_at).toLocaleDateString("id-ID")}
                      </div>
                      {editing === r.id && (
                        <div className="flex gap-1.5 mt-1.5">
                          <Input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Mata pelajaran"
                            className="h-7 text-xs"
                          />
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={async () => {
                              try {
                                await updateNoteGameSubject(r.id, draft);
                                setEditing(null);
                                await load();
                              } catch (e) {
                                toast.error("Gagal menyimpan", {
                                  description: (e as Error).message,
                                });
                              }
                            }}
                          >
                            Simpan
                          </Button>
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      aria-label="Ubah mata pelajaran"
                      onClick={() => {
                        setEditing(editing === r.id ? null : r.id);
                        setDraft(r.subject);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      aria-label="Hapus riwayat"
                      onClick={async () => {
                        try {
                          await deleteNoteGameSession(r.id);
                          await load();
                        } catch (e) {
                          toast.error("Gagal menghapus", { description: (e as Error).message });
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
