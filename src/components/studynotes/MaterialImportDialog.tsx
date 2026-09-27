import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileUp, Loader2, Mic, Presentation, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ACCEPTED_MATERIAL,
  MAX_MATERIAL_BYTES,
  detectKind,
  extractOfficeText,
  fileToBase64,
  formatBytes,
  kindLabel,
  limitFor,
  type MaterialKind,
} from "@/lib/material";
import {
  expandNoteSection,
  generateNoteFromMaterial,
  planNoteOutline,
  transcribeAudio,
} from "@/lib/ingest.functions";
import { extractPdf, isPdfPasswordError } from "@/lib/pdf";

type Depth = "standard" | "deep" | "wide" | "ultra" | "mega";

/** Rencana panjang catatan per tingkat kedalaman. */
const DEPTH_PLAN: Record<
  Depth,
  { label: string; hint: string; sections: number; wordsPerSection: number }
> = {
  standard: { label: "Lengkap", hint: "±1.000 kata · 1 tahap", sections: 0, wordsPerSection: 0 },
  deep: { label: "Sangat mendalam", hint: "±6.000 kata · 6 bagian", sections: 6, wordsPerSection: 900 },
  wide: { label: "Lebih luas", hint: "±11.000 kata · 10 bagian", sections: 10, wordsPerSection: 1100 },
  ultra: { label: "Buku mini", hint: "±18.000 kata · 14 bagian", sections: 14, wordsPerSection: 1200 },
  mega: { label: "Buku penuh", hint: "±35.000+ kata · 24 bagian", sections: 24, wordsPerSection: 1500 },
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Content of the currently active note, when the user wants to enrich it. */
  activeContent?: string;
  onCreated: (title: string, content: string) => Promise<void> | void;
  onEnriched: (title: string, content: string) => void;
};

export function MaterialImportDialog({
  open,
  onOpenChange,
  activeContent,
  onCreated,
  onEnriched,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<MaterialKind>("unsupported");
  const [depth, setDepth] = useState<Depth>("deep");
  const [target, setTarget] = useState<"new" | "merge">("new");
  const [step, setStep] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const doTranscribe = useServerFn(transcribeAudio);
  const doGenerate = useServerFn(generateNoteFromMaterial);
  const doOutline = useServerFn(planNoteOutline);
  const doExpand = useServerFn(expandNoteSection);

  const pick = (f: File | undefined) => {
    if (!f) return;
    const k = detectKind(f);
    if (k === "unsupported") {
      toast.error("Format belum didukung", {
        description: "Gunakan PPTX, DOCX, XLSX, PDF, audio (mp3/wav/m4a), atau teks.",
      });
      return;
    }
    const max = Math.min(limitFor(k), MAX_MATERIAL_BYTES);
    if (f.size > max) {
      toast.error("File terlalu besar", {
        description: `Maksimal ${formatBytes(max)} untuk ${kindLabel(k).toLowerCase()}.`,
      });
      return;
    }
    setFile(f);
    setKind(k);
  };

  const reset = () => {
    setFile(null);
    setKind("unsupported");
    setStep(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const run = useCallback(async () => {
    if (!file) return;
    setProgress(0);
    try {
      let material: string | undefined;
      let images: string[] = [];

      if (kind === "pdf") {
        setStep("Membuka dokumen PDF...");
        let pdf;
        try {
          pdf = await extractPdf(file, {
            onProgress: (p) =>
              setStep(
                p.phase === "text"
                  ? `Membaca halaman ${p.page}/${p.total}...`
                  : `Mengubah halaman tanpa teks jadi gambar ${p.page}/${p.total}...`,
              ),
          });
        } catch (err) {
          if (isPdfPasswordError(err)) {
            throw new Error("PDF terkunci kata sandi. Buka proteksinya lalu unggah ulang.");
          }
          throw new Error("PDF tidak bisa dibaca. Coba ekspor ulang berkasnya.");
        }
        material = pdf.text;
        images = pdf.images;
        if (!material.trim() && !images.length) {
          throw new Error("PDF ini tidak berisi teks maupun halaman yang bisa dibaca");
        }
        if (images.length) {
          toast.info(
            pdf.truncated
              ? `${images.length} halaman dibaca sebagai gambar (halaman berikutnya belum diproses)`
              : `${images.length} halaman tanpa teks dibaca sebagai gambar`,
          );
        }
      } else if (kind === "audio") {
        setStep("Mentranskrip audio...");
        const base64 = await fileToBase64(file);
        const res = await doTranscribe({
          data: { base64, mime: file.type || "audio/mpeg", filename: file.name },
        });
        material = res.text;
      } else if (kind === "text") {
        setStep("Membaca berkas...");
        material = await file.text();
      } else {
        setStep("Mengekstrak isi berkas...");
        material = await extractOfficeText(file, kind);
      }

      if (!images.length && !material?.trim()) {
        throw new Error("Tidak ada teks yang bisa dibaca dari berkas ini");
      }

      const plan = DEPTH_PLAN[depth];
      let title: string;
      let content: string;

      if (plan.sections > 0) {
        setStep(`Menyusun rangka ${plan.sections} bagian...`);
        setProgress(5);
        const outline = await doOutline({
          data: {
            filename: file.name,
            material,
            images,
            existingContent: target === "merge" ? activeContent : undefined,
            sectionCount: plan.sections,
          },
        });

        const headings = outline.sections.map((s) => s.heading);
        const parts: string[] = [];
        for (let i = 0; i < outline.sections.length; i++) {
          const s = outline.sections[i]!;
          setStep(`Menulis bagian ${i + 1}/${outline.sections.length}: ${s.heading}`);
          setProgress(Math.round(10 + (i / outline.sections.length) * 85));
          const res = await doExpand({
            data: {
              title: outline.title,
              digest: outline.digest,
              heading: s.heading,
              points: s.points,
              pages: s.pages ?? "",
              outlineHeadings: headings,
              targetWords: plan.wordsPerSection,
              index: i,
              total: outline.sections.length,
            },
          });
          parts.push(res.markdown);
        }
        setProgress(98);
        title = outline.title;
        content = parts.join("\n\n");
        if (target === "merge" && activeContent?.trim()) {
          content = `${activeContent.trim()}\n\n${content}`;
        }
      } else {
        setStep("AI menyusun & melengkapi catatan...");
        setProgress(40);
        const note = await doGenerate({
          data: {
            filename: file.name,
            material,
            images,
            existingContent: target === "merge" ? activeContent : undefined,
            depth,
          },
        });
        title = note.title;
        content = note.content;
      }

      if (target === "merge") onEnriched(title, content);
      else await onCreated(title, content);

      toast.success("Catatan lengkap dibuat", { description: title });
      onOpenChange(false);
      reset();
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("429")) toast.error("Terlalu banyak permintaan, coba lagi sebentar");
      else if (msg.includes("402")) toast.error("Kredit AI habis, tambah kredit di workspace");
      else toast.error("Gagal memproses materi", { description: msg });
    } finally {
      setStep(null);
      setProgress(0);
    }
  }, [
    file,
    kind,
    target,
    depth,
    activeContent,
    doGenerate,
    doOutline,
    doExpand,
    doTranscribe,
    onCreated,
    onEnriched,
    onOpenChange,
  ]);

  const busy = !!step;


  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-4 h-4" /> Buat catatan dari materi
          </DialogTitle>
          <DialogDescription>
            Unggah PPT, PDF, Word, Excel, rekaman audio, atau teks. AI akan membaca isinya lalu
            menyusun catatan lengkap — poin garis besar dijelaskan, ditambah contoh, istilah, dan
            rangkuman.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!busy) pick(e.dataTransfer.files?.[0]);
          }}
          onClick={() => !busy && inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-accent/50 transition-colors"
        >
          {file ? (
            <div className="space-y-1">
              <div className="font-medium text-sm break-all">{file.name}</div>
              <div className="text-xs text-muted-foreground">
                {kindLabel(kind)} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-3 text-muted-foreground">
                <Presentation className="w-5 h-5" />
                <FileText className="w-5 h-5" />
                <Mic className="w-5 h-5" />
              </div>
              <div className="text-sm">Klik atau tarik berkas ke sini</div>
              <div className="text-xs text-muted-foreground">
                PPTX · DOCX · XLSX · TXT/MD hingga 1 GB · Audio hingga 200 MB · PDF hingga 100 MB
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_MATERIAL}
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(DEPTH_PLAN) as Depth[]).map((v) => (
            <button
              key={v}
              type="button"
              disabled={busy}
              onClick={() => setDepth(v)}
              aria-pressed={depth === v}
              className={`p-3 rounded-md border-2 text-left transition-colors disabled:opacity-60 ${
                depth === v ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
              }`}
            >
              <div className="font-medium text-sm">{DEPTH_PLAN[v].label}</div>
              <div className="text-xs text-muted-foreground">{DEPTH_PLAN[v].hint}</div>
            </button>
          ))}
        </div>

        {depth === "wide" || depth === "ultra" || depth === "mega" ? (
          <p className="text-xs text-muted-foreground">
            Mode ini menulis bagian per bagian dan bisa memakan waktu beberapa menit. Jangan tutup
            dialog selama proses berjalan.
          </p>
        ) : null}


        {activeContent?.trim() ? (
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { v: "new", t: "Catatan baru", d: "Simpan sebagai catatan terpisah" },
                { v: "merge", t: "Lengkapi catatan aktif", d: "Gabung dengan isi sekarang" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setTarget(o.v)}
                className={`p-3 rounded-md border-2 text-left transition-colors ${
                  target === o.v ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                }`}
              >
                <div className="font-medium text-sm">{o.t}</div>
                <div className="text-xs text-muted-foreground">{o.d}</div>
              </button>
            ))}
          </div>
        ) : null}

        {step && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span className="break-words">{step}</span>
            </div>
            {progress > 0 && (
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
              >
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}


        <DialogFooter>
          <Button variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={run} disabled={!file || busy} className="gap-1">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Susun catatan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
