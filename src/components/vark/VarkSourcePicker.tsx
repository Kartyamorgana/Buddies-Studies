// src/components/vark/VarkSourcePicker.tsx
import { useState } from "react";
import { FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StemNotePickerDialog } from "@/components/stem/StemNotePickerDialog";

export type VarkSource = {
  kind: "notes" | "topic" | "text";
  ref: string | null;
  topic: string;
  material: string;
};

/**
 * Pemilih materi untuk Auditory & Kinesthetic Studio.
 * Sumber: catatan tersimpan, topik bebas, atau tempel teks.
 */
export function VarkSourcePicker({
  value,
  onChange,
}: {
  value: VarkSource | null;
  onChange: (s: VarkSource) => void;
}) {
  const [notePicker, setNotePicker] = useState(false);
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Sumber Materi</div>
          <div className="text-xs text-muted-foreground">
            Ambil dari catatanmu, tulis topik, atau tempel teks materi.
          </div>
        </div>
        {value && (
          <span className="text-[11px] rounded-full border border-primary/40 bg-primary/10 text-primary px-2.5 py-1 max-w-56 truncate shrink-0">
            {value.topic || "Materi tempelan"}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setNotePicker(true)}
        >
          <FileText className="w-3.5 h-3.5" /> Dari catatan
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topik bebas, mis. Hukum Newton, Fotosintesis…"
          className="text-sm"
        />
        <Button
          size="sm"
          className="gap-1.5"
          disabled={!topic.trim()}
          onClick={() => {
            onChange({ kind: "topic", ref: null, topic: topic.trim(), material: "" });
            toast.success("Topik dipakai", { description: topic.trim() });
          }}
        >
          <Sparkles className="w-3.5 h-3.5" /> Pakai topik
        </Button>
      </div>

      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Atau tempel materi di sini…"
          className="min-h-20 text-sm"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            disabled={text.trim().length < 40}
            onClick={() => {
              onChange({
                kind: "text",
                ref: null,
                topic: topic.trim() || "Materi tempelan",
                material: text.trim(),
              });
              toast.success("Materi siap dipakai");
            }}
          >
            Pakai teks ini
          </Button>
        </div>
      </div>

      <StemNotePickerDialog
        open={notePicker}
        onOpenChange={setNotePicker}
        onPick={(n) => {
          onChange({
            kind: "notes",
            ref: n.id,
            topic: n.title,
            material: n.content,
          });
          toast.success("Catatan dipilih", { description: n.title });
        }}
      />
    </div>
  );
}
