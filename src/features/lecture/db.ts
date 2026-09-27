// Data akses untuk transkrip kuliah.
import { supabase } from "@/integrations/supabase/client";

export type TranscriptRow = {
  id: string;
  title: string;
  transcript: string;
  source_kind: string;
  duration_sec: number;
  created_at: string;
};

export async function saveTranscript(input: {
  title: string;
  transcript: string;
  sourceKind: "record" | "upload";
  durationSec: number;
}): Promise<TranscriptRow> {
  const { data, error } = await supabase
    .from("lecture_transcripts")
    .insert({
      title: input.title,
      transcript: input.transcript,
      source_kind: input.sourceKind,
      duration_sec: Math.round(input.durationSec),
    })
    .select("id, title, transcript, source_kind, duration_sec, created_at")
    .single();
  if (error) throw error;
  return data as TranscriptRow;
}

export async function fetchTranscripts(limit = 20): Promise<TranscriptRow[]> {
  const { data, error } = await supabase
    .from("lecture_transcripts")
    .select("id, title, transcript, source_kind, duration_sec, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as TranscriptRow[];
}

export async function deleteTranscript(id: string) {
  const { error } = await supabase.from("lecture_transcripts").delete().eq("id", id);
  if (error) throw error;
}
