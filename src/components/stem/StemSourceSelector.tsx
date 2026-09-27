// src/components/stem/StemSourceSelector.tsx
import { useState } from "react";
import { FileText, Upload, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StemNotePickerDialog } from "./StemNotePickerDialog";

const MAX_FILE = 100 * 1024 * 1024;

/** Sumber materi terpilih — dipakai sebagai input untuk Analyzer / CheatSheet / Practice. */
export type StemSource =
  | { type: "notes"; noteId: string; topic: string; material: string }
  | { type: "file"; filename: string; mime: string; base64: string; material?: string }
  | { type: "topic"; topic: string };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result ?? "");
      resolve(s.slice(s.indexOf(",") + 1));
    };
    r.onerror = () => reject(new Error("Gagal membaca file"));
    r.readAsDataURL(file);
  });
}

type CardKey = "notes" | "file" | "topic" | null;

/**
 * Pemilih sumber materi: 3 kartu (Catatan / File / Topik).
 * Setelah dipilih, memancarkan `StemSource` ke parent via `onSelect`.
 */
export function StemSourceSelector({
  onSelect,
  current,
}: {
  onSelect: (s: StemSource) => void;
  current: StemSource | null;
}) {
  const [expanded, setExpanded] = useState<CardKey>(null);
  const [notePickerOpen, setNotePickerOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [topicDraft, setTopicDraft] = useState("");

  const handleFilePicked = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_FILE) {
      toast.error("File terlalu besar", { description: "Maksimal 100 MB." });
      return;
    }
    setFile(f);
    setBusy(true);
    try {
      const base64 = await fileToBase64(f);
      onSelect({
        type: "file",
        filename: f.name,
        mime: f.type || "application/octet-stream",
        base64,
      });
      setExpanded(null);
      setFile(null);
      toast.success("File siap", { description: f.name });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membaca file");
    } finally {
      setBusy(false);
    }
  };

  const handleTopicSubmit = () => {
    const t = topicDraft.trim();
    if (!t) return;
    onSelect({ type: "topic", topic: t });
    setExpanded(null);
    setTopicDraft("");
  };

  const label = (() => {
    if (!current) return null;
    if (current.type === "notes") return `Catatan: ${current.topic}`;
    if (current.type === "file") return `File: ${current.filename}`;
    return `Topik: ${current.topic}`;
  })();

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Sumber Materi</div>
          <div className="text-xs text-muted-foreground">
            Pilih dari mana materi akan diambil. Bisa diganti kapan saja.
          </div>
        </div>
        {label && (
          <span className="text-[11px] rounded-full border border-primary/40 bg-primary/10 text-primary px-2.5 py-1 max-w-60 truncate shrink-0">
            {label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <SourceCard
          icon={<FileText className="w-4 h-4" />}
          title="Dari Catatan"
          subtitle="Ambil catatan tersimpan"
          active={expanded === "notes"}
          onClick={() => {
            setExpanded("notes");
            setNotePickerOpen(true);
          }}
        />
        <SourceCard
          icon={<Upload className="w-4 h-4" />}
          title="Upload File"
          subtitle="PDF · Gambar · Teks"
          active={expanded === "file"}
          onClick={() => setExpanded("file")}
        />
        <SourceCard
          icon={<Sparkles className="w-4 h-4" />}
          title="Topik Bebas"
          subtitle="Tulis topik langsung"
          active={expanded === "topic"}
          onClick={() => setExpanded("topic")}
        />
      </div>

      {expanded === "file" && (
        <div className="rounded-xl border border-dashed border-border p-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Upload className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {file ? file.name : "Pilih file PDF / gambar / teks"}
            </span>
            <input
              type="file"
              accept=".pdf,.txt,.md,image/*"
              className="hidden"
              onChange={(e) => void handleFilePicked(e.target.files?.[0])}
            />
          </label>
          {busy && (
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Membaca file…
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Untuk gambar (OCR teks) dan PDF, materi akan diekstrak langsung oleh AI saat analisis.
          </p>
        </div>
      )}

      {expanded === "topic" && (
        <div className="rounded-xl border border-border p-3 space-y-2">
          <Textarea
            value={topicDraft}
            onChange={(e) => setTopicDraft(e.target.value)}
            placeholder="Mis. Logika Matematika SNBT, Hukum Newton, Perbandingan Senilai…"
            className="min-h-18 text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setExpanded(null)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleTopicSubmit} disabled={!topicDraft.trim()}>
              Pakai topik
            </Button>
          </div>
        </div>
      )}

      <StemNotePickerDialog
        open={notePickerOpen}
        onOpenChange={setNotePickerOpen}
        onPick={(n) => {
          onSelect({
            type: "notes",
            noteId: n.id,
            topic: n.title,
            material: n.content,
          });
          setExpanded(null);
          toast.success("Catatan dipilih", { description: n.title });
        }}
      />
    </div>
  );
}

function SourceCard({
  icon,
  title,
  subtitle,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-colors ${
        active ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
      }`}
    >
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
        {subtitle}
      </div>
    </button>
  );
}