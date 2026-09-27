// src/components/stem/StemNotePickerDialog.tsx
import { useEffect, useMemo, useState } from "react";
import { FileText, Folder as FolderIcon, Loader2, Search, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchAll, type Note, type Folder } from "@/lib/db";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (n: { id: string; title: string; content: string }) => void;
};

/**
 * Dialog pemilih catatan: search + list, single-select, double-click untuk langsung pilih.
 * Mengambil data langsung dari Supabase (RLS sudah jaga hanya note milik user).
 */
export function StemNotePickerDialog({ open, onOpenChange, onPick }: Props) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchAll()
      .then(({ notes, folders }) => {
        setNotes(notes);
        setFolders(folders);
      })
      .catch((e) =>
        toast.error("Gagal memuat catatan", {
          description: e instanceof Error ? e.message : undefined,
        }),
      )
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedId(null);
    }
  }, [open]);

  const folderName = useMemo(() => {
    const m: Record<string, string> = {};
    folders.forEach((f) => {
      m[f.id] = f.name;
    });
    return m;
  }, [folders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => {
      const t = `${n.title} ${n.content}`.toLowerCase();
      return t.includes(q);
    });
  }, [notes, query]);

  const selected = useMemo(
    () => filtered.find((n) => n.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const handleConfirm = () => {
    if (!selected) return;
    onPick({
      id: selected.id,
      title: selected.title || "Untitled",
      content: selected.content,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85dvh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Pilih Catatan
          </DialogTitle>
          <DialogDescription>
            Ambil isi catatan sebagai materi untuk dianalisis atau dijadikan soal.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul atau isi catatan…"
              className="pl-8 h-9"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="grid place-items-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mb-2" />
              <div className="text-xs">Memuat catatan…</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {notes.length === 0
                ? "Belum ada catatan. Buat dulu di halaman Notes."
                : `Tidak ada catatan untuk "${query}".`}
            </div>
          ) : (
            <ul className="p-2">
              {filtered.map((n) => {
                const active = n.id === selectedId;
                const preview = n.content
                  .replace(/[#*_`>[\]]/g, "")
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 120);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(n.id)}
                      onDoubleClick={() => {
                        setSelectedId(n.id);
                        onPick({
                          id: n.id,
                          title: n.title || "Untitled",
                          content: n.content,
                        });
                        onOpenChange(false);
                      }}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-transparent hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {active ? (
                          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        ) : (
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {n.title || "Untitled"}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {preview || "(kosong)"}
                          </div>
                          {n.folder_id && folderName[n.folder_id] && (
                            <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1 mt-1">
                              <FolderIcon className="w-3 h-3" />
                              {folderName[n.folder_id]}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleConfirm} disabled={!selected}>
            Pilih Catatan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}