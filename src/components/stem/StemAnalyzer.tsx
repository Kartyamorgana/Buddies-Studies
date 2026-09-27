// src/components/stem/StemAnalyzer.tsx
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Upload, Wand2, X, Copy, Check, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MarkdownPreview } from "@/components/studynotes/MarkdownPreview";
import {
  analyzeStemMaterial,
  SUBJECTS,
  type SubjectId,
  type StemAnalysis,
} from "@/lib/stem.functions";
import type { StemSource } from "./StemSourceSelector";

const MAX_FILE = 100 * 1024 * 1024;

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result ?? "");
      resolve(s.slice(s.indexOf(",") + 1));
    };
    r.onerror = () => reject(new Error("Gagal membaca file"));
    r.readAsDataURL(file);
  });
}

function CheatCard({ item }: { item: { name: string; latex: string; when: string } }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold text-muted-foreground">{item.name}</div>
        <button
          type="button"
          aria-label={`Salin rumus ${item.name}`}
          className="text-muted-foreground hover:text-foreground"
          onClick={() => {
            navigator.clipboard.writeText(item.latex);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="mt-1 overflow-x-auto text-base">
        <MarkdownPreview source={`$$${item.latex}$$`} />
      </div>
      {item.when ? (
        <div className="mt-1 text-xs text-muted-foreground">{item.when}</div>
      ) : null}
    </div>
  );
}

export function StemAnalyzer({
  subject,
  onSubjectChange,
  onResult,
  onSaveNote,
  initialSource,
}: {
  subject: SubjectId;
  onSubjectChange: (s: SubjectId) => void;
  onResult: (a: StemAnalysis) => void;
  onSaveNote: (title: string, markdown: string) => void;
  initialSource?: StemSource | null;
}) {
  const analyze = useServerFn(analyzeStemMaterial);
  const [topic, setTopic] = useState("");
  const [material, setMaterial] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StemAnalysis | null>(null);

  // Sinkronkan source yang dipilih user → isi input.
  useEffect(() => {
    if (!initialSource) return;
    if (initialSource.type === "topic") {
      setTopic(initialSource.topic);
      setMaterial("");
      setFile(null);
    } else if (initialSource.type === "notes") {
      setTopic(initialSource.topic);
      setMaterial(initialSource.material);
      setFile(null);
    } else if (initialSource.type === "file") {
      // File dari source selector: base64 langsung dipakai saat analisis.
      setTopic("");
      setMaterial("");
      setFile(null);
    }
  }, [initialSource]);

  const run = async () => {
    const fromSourceFile = initialSource?.type === "file" ? initialSource : null;

    if (!topic.trim() && !material.trim() && !file && !fromSourceFile) {
      toast.error("Isi topik, tempel materi, atau unggah file dulu");
      return;
    }
    setBusy(true);
    try {
      let fileBase64: string | undefined;
      let fileMime: string | undefined;
      let filename: string | undefined;

      if (fromSourceFile) {
        fileBase64 = fromSourceFile.base64;
        fileMime = fromSourceFile.mime;
        filename = fromSourceFile.filename;
      } else if (file) {
        if (file.size > MAX_FILE) throw new Error("Ukuran file maksimal 100 MB");
        fileBase64 = await toBase64(file);
        fileMime = file.type || "application/pdf";
        filename = file.name;
      }

      const res = await analyze({
        data: {
          subject,
          topic: topic.trim() || undefined,
          material: material.trim() || undefined,
          filename,
          fileBase64,
          fileMime,
        },
      });
      setResult(res);
      onResult(res);
      toast.success("Materi selesai dianalisis");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analisis gagal");
    } finally {
      setBusy(false);
    }
  };

  const asMarkdown = (a: StemAnalysis) =>
    [
      `# ${a.title}`,
      a.overview && `## 🎯 Gambaran Umum\n\n${a.overview}`,
      a.concepts && `## 🧠 Konsep\n\n${a.concepts}`,
      a.formulas && `## 📐 Rumus\n\n${a.formulas}`,
      a.cheatsheet.length &&
        `## ⚡ Cheat Sheet\n\n${a.cheatsheet
          .map((c) => `- **${c.name}** — $${c.latex}$${c.when ? ` — ${c.when}` : ""}`)
          .join("\n")}`,
      a.pitfalls && `## ⚠️ Kesalahan Umum\n\n${a.pitfalls}`,
    ]
      .filter(Boolean)
      .join("\n\n");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5">Bidang</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSubjectChange(s.id)}
                aria-pressed={subject === s.id}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  subject === s.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-accent"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {initialSource?.type === "file" && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <FileCheck2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">
              Menggunakan file dari Sumber Materi: <b>{initialSource.filename}</b>
            </span>
          </div>
        )}

        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topik yang mau dipelajari, mis. Perbandingan senilai & berbalik nilai"
        />

        <Textarea
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          placeholder="Tempel materi/teks di sini (opsional)"
          className="min-h-24 font-mono text-xs"
        />

        {initialSource?.type !== "file" && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs cursor-pointer hover:bg-accent">
              <Upload className="w-3.5 h-3.5" />
              {file ? "Ganti file" : "Unggah PDF / gambar / teks"}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.txt,.md,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {file && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                {file.name}
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  aria-label="Hapus file"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        <Button onClick={run} disabled={busy} className="w-full gap-1.5">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {busy ? "Menganalisis…" : "Analisis materi"}
        </Button>
      </div>

      {result && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-bold tracking-tight">{result.title}</h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onSaveNote(result.title, asMarkdown(result))}
            >
              Simpan jadi catatan
            </Button>
          </div>

          {result.cheatsheet.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mb-4">
              {result.cheatsheet.map((c, i) => (
                <CheatCard key={`${c.name}-${i}`} item={c} />
              ))}
            </div>
          )}

          <Tabs defaultValue="overview">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="overview" className="text-xs">
                Gambaran
              </TabsTrigger>
              <TabsTrigger value="concepts" className="text-xs">
                Konsep
              </TabsTrigger>
              <TabsTrigger value="formulas" className="text-xs">
                Rumus
              </TabsTrigger>
              <TabsTrigger value="pitfalls" className="text-xs">
                Jebakan
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <MarkdownPreview source={result.overview || "_Belum ada._"} />
            </TabsContent>
            <TabsContent value="concepts">
              <MarkdownPreview source={result.concepts || "_Belum ada._"} />
            </TabsContent>
            <TabsContent value="formulas">
              <MarkdownPreview source={result.formulas || "_Belum ada._"} />
            </TabsContent>
            <TabsContent value="pitfalls">
              <MarkdownPreview source={result.pitfalls || "_Belum ada._"} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}