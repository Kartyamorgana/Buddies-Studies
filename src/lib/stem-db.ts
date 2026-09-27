// src/lib/stem-db.ts
import { supabase } from "@/integrations/supabase/client";
import type {
  SessionFinishPayload,
  StemBookmarkInsert,
  StemBookmarkRow,
  StemDb,
  StemQuestionInsert,
  StemQuestionRow,
  StemSessionInsert,
  StemSessionRow,
  WeaknessRow,
} from "./stem-schema";
import { computeScore } from "./stem-schema";

const db = () => supabase as unknown as StemDb;

/* ------------------------------- Sessions -------------------------------- */

export async function createStemSession(
  input: StemSessionInsert,
): Promise<StemSessionRow> {
  const { data, error } = await db()
    .from("stem_quiz_sessions")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function finishStemSession(payload: SessionFinishPayload): Promise<void> {
  const score = computeScore(payload.correctCount, payload.totalQuestions);
  const { error } = await db()
    .from("stem_quiz_sessions")
    .update({
      correct_count: payload.correctCount,
      total_questions: payload.totalQuestions,
      score,
      duration_sec: payload.durationSec,
      ended_at: new Date().toISOString(),
    })
    .eq("id", payload.sessionId);
  if (error) throw error;
}

export async function fetchRecentSessions(limit = 20): Promise<StemSessionRow[]> {
  const { data, error } = await db()
    .from("stem_quiz_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchSessionWithQuestions(sessionId: string): Promise<{
  session: StemSessionRow;
  questions: StemQuestionRow[];
}> {
  const [s, q] = await Promise.all([
    db().from("stem_quiz_sessions").select("*").eq("id", sessionId).single(),
    db()
      .from("stem_quiz_questions")
      .select("*")
      .eq("session_id", sessionId)
      .order("ord", { ascending: true }),
  ]);
  if (s.error) throw s.error;
  if (q.error) throw q.error;
  return { session: s.data, questions: q.data ?? [] };
}

/* ------------------------------- Questions ------------------------------- */

export async function insertStemQuestions(
  rows: StemQuestionInsert[],
): Promise<StemQuestionRow[]> {
  if (!rows.length) return [];
  const { data, error } = await db()
    .from("stem_quiz_questions")
    .insert(rows)
    .select()
    .order("ord", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function submitStemAnswer(args: {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentSec: number;
}): Promise<void> {
  const { error } = await db()
    .from("stem_quiz_questions")
    .update({
      user_answer: args.userAnswer,
      is_correct: args.isCorrect,
      time_spent_sec: args.timeSpentSec,
    })
    .eq("id", args.questionId);
  if (error) throw error;
}

/* ------------------------------- Analytics ------------------------------- */

export async function fetchWeakness(): Promise<WeaknessRow[]> {
  const { data, error } = await db()
    .from("stem_weakness")
    .select("*")
    .order("accuracy_pct", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type CategorySummary = {
  subject: WeaknessRow["subject"];
  totalAttempts: number;
  totalCorrect: number;
  accuracyPct: number;
  weakTopics: number;
};

export function summarizeByCategory(rows: WeaknessRow[]): CategorySummary[] {
  const map = new Map<WeaknessRow["subject"], CategorySummary>();
  for (const r of rows) {
    const cur = map.get(r.subject) ?? {
      subject: r.subject,
      totalAttempts: 0,
      totalCorrect: 0,
      accuracyPct: 0,
      weakTopics: 0,
    };
    cur.totalAttempts += r.attempts;
    cur.totalCorrect += r.correct;
    if (r.accuracy_pct < 60) cur.weakTopics += 1;
    map.set(r.subject, cur);
  }
  for (const v of map.values()) {
    v.accuracyPct =
      v.totalAttempts > 0
        ? Math.round((v.totalCorrect / v.totalAttempts) * 1000) / 10
        : 0;
  }
  return [...map.values()];
}

/* ------------------------------ Bookmarks -------------------------------- */

export async function fetchBookmarks(): Promise<StemBookmarkRow[]> {
  const { data, error } = await db()
    .from("stem_bookmarks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function bookmarkQuestion(
  input: StemBookmarkInsert,
): Promise<StemBookmarkRow> {
  const { data, error } = await db()
    .from("stem_bookmarks")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeBookmarkByText(questionText: string): Promise<void> {
  const { error } = await db()
    .from("stem_bookmarks")
    .delete()
    .eq("question_text", questionText);
  if (error) throw error;
}

export async function deleteBookmark(id: string): Promise<void> {
  const { error } = await db()
    .from("stem_bookmarks")
    .delete()
    .eq("id", id);
  if (error) throw error;
}