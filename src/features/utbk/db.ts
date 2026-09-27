// Data akses untuk prediksi skor UTBK.
import { supabase } from "@/integrations/supabase/client";
import type { ItemAttempt } from "./irt";
import { DIFFICULTY_B, predictScore, type PredictionResult } from "./irt";

export type CampusRow = {
  id: string;
  campus: string;
  major: string;
  group_kind: string;
  passing_score: number;
  subscores: Record<string, number>;
};

export const SUBJECT_LABELS: Record<string, string> = {
  umum: "Penalaran Umum",
  kuantitatif: "Pengetahuan Kuantitatif",
  matematika: "Penalaran Matematika",
  custom: "Latihan Mandiri",
};

export async function fetchCampuses(): Promise<CampusRow[]> {
  const { data, error } = await supabase
    .from("target_campuses")
    .select("*")
    .order("campus", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    campus: r.campus,
    major: r.major,
    group_kind: r.group_kind,
    passing_score: Number(r.passing_score),
    subscores: (r.subscores ?? {}) as Record<string, number>,
  }));
}

type AttemptRow = {
  subject: string;
  difficulty: string;
  correct: boolean;
  topic: string;
  at: string;
};

/** Ambil seluruh riwayat jawaban latihan STEM milik pemakai. */
export async function fetchAttempts(limit = 600): Promise<AttemptRow[]> {
  const { data: sessions, error: sErr } = await supabase
    .from("stem_quiz_sessions")
    .select("id, subject, difficulty, started_at")
    .order("started_at", { ascending: false })
    .limit(80);
  if (sErr) throw sErr;
  const list = sessions ?? [];
  if (!list.length) return [];

  const meta = new Map(list.map((s) => [s.id, s]));
  const { data: questions, error: qErr } = await supabase
    .from("stem_quiz_questions")
    .select("session_id, is_correct, topic, created_at")
    .in(
      "session_id",
      list.map((s) => s.id),
    )
    .not("is_correct", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (qErr) throw qErr;

  return (questions ?? []).flatMap((q) => {
    const s = meta.get(q.session_id);
    if (!s) return [];
    return [
      {
        subject: s.subject,
        difficulty: s.difficulty,
        correct: !!q.is_correct,
        topic: q.topic ?? "",
        at: q.created_at,
      },
    ];
  });
}

/** Kelompokkan riwayat per mata uji lalu hitung estimasi skor. */
export function buildPrediction(attempts: AttemptRow[]): PredictionResult {
  const order = ["umum", "kuantitatif", "matematika", "custom"];
  const bySubject = order.map((subject) => {
    const items: ItemAttempt[] = attempts
      .filter((a) => a.subject === subject)
      .map((a, i) => ({
        difficulty: DIFFICULTY_B[a.difficulty] ?? 0,
        correct: a.correct,
        // jawaban terbaru diberi bobot sedikit lebih besar
        weight: i < 60 ? 1.2 : 0.8,
      }));
    return { subject, label: SUBJECT_LABELS[subject] ?? subject, items };
  });
  return predictScore(bySubject);
}

/** Topik dengan akurasi terendah (minimal 3 percobaan). */
export function weakTopics(attempts: AttemptRow[], max = 8) {
  const map = new Map<string, { subject: string; topic: string; n: number; ok: number }>();
  for (const a of attempts) {
    const topic = a.topic.trim();
    if (!topic) continue;
    const key = `${a.subject}::${topic}`;
    const cur = map.get(key) ?? { subject: a.subject, topic, n: 0, ok: 0 };
    cur.n += 1;
    if (a.correct) cur.ok += 1;
    map.set(key, cur);
  }
  return [...map.values()]
    .filter((v) => v.n >= 3)
    .map((v) => ({ ...v, accuracyPct: Math.round((v.ok / v.n) * 100) }))
    .sort((a, b) => a.accuracyPct - b.accuracyPct)
    .slice(0, max);
}

export async function savePrediction(input: {
  total: number;
  subjectScores: Record<string, number>;
  ability: Record<string, number>;
  sampleSize: number;
  targetCampusId: string | null;
  targetLabel: string;
}) {
  const { error } = await supabase.from("user_utbk_predictions").insert({
    total_score: input.total,
    subject_scores: input.subjectScores,
    ability: input.ability,
    sample_size: input.sampleSize,
    target_campus_id: input.targetCampusId,
    target_label: input.targetLabel,
  });
  if (error) throw error;
}

export async function fetchPredictionHistory(limit = 12) {
  const { data, error } = await supabase
    .from("user_utbk_predictions")
    .select("id, total_score, target_label, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    total: Number(r.total_score),
    targetLabel: r.target_label,
    createdAt: r.created_at,
  }));
}
