// src/components/stem/StemStudioPage.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Bookmark,
  FlaskConical,
  Notebook,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { createNote, updateNote } from "@/lib/db";
import { HeaderActions } from "@/components/common/HeaderActions";
import { StemTopNav } from "./StemTopNav";
import { StemAnalyzer } from "./StemAnalyzer";
import { StemPractice } from "./StemPractice";
import { StemConceptNotes } from "./StemConceptNotes";
import { StemSourceSelector, type StemSource } from "./StemSourceSelector";
import { StemPomodoro } from "./StemPomodoro";
import { SUBJECTS, type StemAnalysis, type SubjectId } from "@/lib/stem.functions";


type StemTab = "analyzer" | "conceptnotes" | "practice";

function isSubjectId(x: string | undefined): x is SubjectId {
  return !!x && SUBJECTS.some((s) => s.id === x);
}

export function StemStudioPage({
  initialTopic,
  initialSubject,
}: {
  initialTopic?: string;
  initialSubject?: string;
}) {
  const [subject, setSubject] = useState<SubjectId>(
    isSubjectId(initialSubject) ? initialSubject : "matematika",
  );
  const [analysis, setAnalysis] = useState<StemAnalysis | null>(null);
  const [tab, setTab] = useState<StemTab>("analyzer");
  const [source, setSource] = useState<StemSource | null>(null);
  const appliedRef = useRef(false);

  // A — Terapkan query param sekali saat mount (dari dashboard Analytics)
  useEffect(() => {
    if (appliedRef.current) return;
    if (!initialTopic && !initialSubject) return;
    appliedRef.current = true;

    if (initialTopic) {
      setSource({ type: "topic", topic: initialTopic });
      setTab("practice");
      toast.info("Latihan disiapkan dari topik lemah", {
        description: initialTopic,
      });
    }
  }, [initialTopic, initialSubject]);

  const derivedFromAnalysis = analysis
    ? [analysis.overview, analysis.concepts, analysis.formulas, analysis.pitfalls]
        .filter((s) => s && s.trim().length > 0)
        .join("\n\n")
    : undefined;

  const fallbackTopic =
    source?.type === "notes" ? source.topic : source?.type === "topic" ? source.topic : undefined;

  const fallbackMaterial =
    source?.type === "notes"
      ? source.material
      : source?.type === "file" && source.material
        ? source.material
        : undefined;

  const finalTopic = analysis?.title ?? fallbackTopic;
  const finalMaterial = derivedFromAnalysis ?? fallbackMaterial;

  const saveAsNote = useCallback(async (title: string, markdown: string) => {
    try {
      const n = await createNote(null);
      await updateNote(n.id, { title, content: markdown });
      toast.success("Catatan tersimpan", { description: title });
    } catch (e) {
      toast.error("Gagal menyimpan catatan", { description: (e as Error).message });
    }
  }, []);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="h-14 shrink-0 border-b border-border flex items-center gap-2 px-2 sm:px-4 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div className="hidden xl:block min-w-0">
            <div className="font-semibold leading-none text-sm truncate">
              STEM &amp; SNBT Prep Studio
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
              Matematika · Fisika · Logika · UTBK SNBT
            </div>
          </div>
        </div>

        <StemTopNav className="ml-auto min-w-0" />

        {/* D — Pomodoro */}
        <StemPomodoro />

        <HeaderActions
          extras={[
            { to: "/stem/bookmarks", label: "Bank Soal", icon: Bookmark },
            { to: "/stem/analytics", label: "Analitik", icon: BarChart3 },
          ]}
        />
      </header>


      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-5xl w-full p-3 sm:p-5 space-y-4">
          <StemSourceSelector onSelect={setSource} current={source} />

          {source && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span>
                Sumber aktif:{" "}
                <b className="text-foreground">
                  {source.type === "notes"
                    ? `Catatan · ${source.topic}`
                    : source.type === "file"
                      ? `File · ${source.filename}`
                      : `Topik · ${source.topic}`}
                </b>
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[11px] gap-1"
                onClick={() => setSource(null)}
              >
                <X className="w-3 h-3" /> Hapus sumber
              </Button>
            </div>
          )}

          <Tabs value={tab} onValueChange={(v) => setTab(v as StemTab)}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="analyzer" className="gap-1.5 text-xs sm:text-sm">
                <Sparkles className="w-3.5 h-3.5" /> Analisis
              </TabsTrigger>
              <TabsTrigger value="conceptnotes" className="gap-1.5 text-xs sm:text-sm">
                <Notebook className="w-3.5 h-3.5" /> Konsep &amp; Rumus
              </TabsTrigger>
              <TabsTrigger value="practice" className="gap-1.5 text-xs sm:text-sm">
                <Trophy className="w-3.5 h-3.5" /> Latihan
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analyzer" forceMount className="mt-4 data-[state=inactive]:hidden">
              <StemAnalyzer
                subject={subject}
                onSubjectChange={setSubject}
                onResult={(a) => {
                  setAnalysis(a);
                  setTab("conceptnotes");
                }}
                onSaveNote={saveAsNote}
                initialSource={source}
              />
            </TabsContent>

            <TabsContent
              value="conceptnotes"
              forceMount
              className="mt-4 data-[state=inactive]:hidden"
            >
              <StemConceptNotes
                subject={subject}
                topic={finalTopic}
                material={finalMaterial}
                onSaveNote={saveAsNote}
              />
            </TabsContent>

            <TabsContent value="practice" forceMount className="mt-4 data-[state=inactive]:hidden">
              <StemPractice subject={subject} topic={finalTopic} material={finalMaterial} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
