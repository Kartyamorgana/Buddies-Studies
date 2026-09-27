// Riwayat latihan/game dari catatan (mata pelajaran diisi manual oleh pengguna).
import { supabase } from "@/integrations/supabase/client";

export type NoteGameRow = {
  id: string;
  note_id: string | null;
  note_title: string;
  subject: string;
  game_type: string;
  difficulty: string;
  total_items: number;
  correct_count: number;
  score: number;
  duration_sec: number;
  timed: boolean;
  created_at: string;
};

const COLS =
  "id, note_id, note_title, subject, game_type, difficulty, total_items, correct_count, score, duration_sec, timed, created_at";

export async function saveNoteGameSession(input: {
  noteId: string | null;
  noteTitle: string;
  subject: string;
  gameType: string;
  difficulty: string;
  totalItems: number;
  correctCount: number;
  durationSec: number;
  timed: boolean;
}): Promise<NoteGameRow> {
  const score = input.totalItems > 0 ? (input.correctCount / input.totalItems) * 100 : 0;
  const { data, error } = await supabase
    .from("note_game_sessions")
    .insert({
      note_id: input.noteId,
      note_title: input.noteTitle.slice(0, 200),
      subject: input.subject.trim() || "Umum",
      game_type: input.gameType,
      difficulty: input.difficulty,
      total_items: input.totalItems,
      correct_count: input.correctCount,
      score: Math.round(score * 10) / 10,
      duration_sec: Math.max(0, Math.round(input.durationSec)),
      timed: input.timed,
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return data as NoteGameRow;
}

export async function fetchNoteGameSessions(limit = 100): Promise<NoteGameRow[]> {
  const { data, error } = await supabase
    .from("note_game_sessions")
    .select(COLS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as NoteGameRow[];
}

export async function deleteNoteGameSession(id: string) {
  const { error } = await supabase.from("note_game_sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function updateNoteGameSubject(id: string, subject: string) {
  const { error } = await supabase
    .from("note_game_sessions")
    .update({ subject: subject.trim() || "Umum" })
    .eq("id", id);
  if (error) throw error;
}

/** Daftar mata pelajaran yang pernah dipakai, untuk saran isian manual. */
export function subjectsOf(rows: NoteGameRow[]) {
  return Array.from(new Set(rows.map((r) => r.subject))).sort();
}
