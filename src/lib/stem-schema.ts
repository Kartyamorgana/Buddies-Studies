// src/lib/stem-schema.ts
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const STEM_SUBJECTS = ["umum", "kuantitatif", "matematika", "custom"] as const;
export const STEM_DIFFICULTIES = ["easy", "medium", "hard", "hots"] as const;
export const STEM_MODES = ["relaxed", "exam"] as const;

export type StemSubject = (typeof STEM_SUBJECTS)[number];
export type StemDifficulty = (typeof STEM_DIFFICULTIES)[number];
export type StemMode = (typeof STEM_MODES)[number];

export const SubjectSchema = z.enum(STEM_SUBJECTS);
export const DifficultySchema = z.enum(STEM_DIFFICULTIES);
export const ModeSchema = z.enum(STEM_MODES);

/* -------------------------------------------------------------------------- */
/*  Row types                                                                 */
/* -------------------------------------------------------------------------- */

export type StemSessionRow = {
  id: string;
  user_id: string;
  subject: StemSubject;
  difficulty: StemDifficulty;
  mode: StemMode;
  topic: string | null;
  total_questions: number;
  correct_count: number;
  score: number;
  duration_sec: number;
  time_limit_sec: number | null;
  started_at: string;
  ended_at: string | null;
  metadata: Record<string, unknown>;
};

export type StemQuestionRow = {
  id: string;
  session_id: string;
  user_id: string;
  ord: number;
  question_text: string;
  type: "mc" | "num";
  options: string[];
  correct_answer: string;
  user_answer: string | null;
  is_correct: boolean | null;
  hints: string[];
  solution: string;
  topic: string;
  time_spent_sec: number;
  created_at: string;
};

export type WeaknessRow = {
  user_id: string;
  subject: StemSubject;
  topic: string;
  attempts: number;
  correct: number;
  accuracy_pct: number;
  last_seen: string;
};

/* -------------------------------------------------------------------------- */
/*  Bookmark types                                                            */
/* -------------------------------------------------------------------------- */

export type StemBookmarkRow = {
  id: string;
  user_id: string;
  subject: StemSubject;
  question_text: string;
  type: "mc" | "num";
  options: string[];
  correct_answer: string;
  solution: string;
  hints: string[];
  topic: string;
  note: string | null;
  created_at: string;
};

export type StemBookmarkInsert = {
  subject: StemSubject;
  question_text: string;
  type: "mc" | "num";
  options: string[];
  correct_answer: string;
  solution: string;
  hints: string[];
  topic: string;
  note?: string | null;
};

export type StemBookmarkUpdate = {
  note?: string | null;
  topic?: string;
};

/* -------------------------------------------------------------------------- */
/*  Insert / Update payloads                                                  */
/* -------------------------------------------------------------------------- */

export type StemSessionInsert = {
  subject: StemSubject;
  difficulty: StemDifficulty;
  mode: StemMode;
  topic: string | null;
  time_limit_sec: number | null;
  total_questions?: number;
  correct_count?: number;
  score?: number;
  duration_sec?: number;
  metadata?: Record<string, unknown>;
};

export type StemQuestionInsert = {
  session_id: string;
  ord: number;
  question_text: string;
  type: "mc" | "num";
  options: string[];
  correct_answer: string;
  hints: string[];
  solution: string;
  topic: string;
  user_answer?: string | null;
  is_correct?: boolean | null;
  time_spent_sec?: number;
};

export type StemSessionUpdate = {
  subject?: StemSubject;
  difficulty?: StemDifficulty;
  mode?: StemMode;
  topic?: string | null;
  total_questions?: number;
  correct_count?: number;
  score?: number;
  duration_sec?: number;
  time_limit_sec?: number | null;
  ended_at?: string | null;
  metadata?: Record<string, unknown>;
};

export type StemQuestionUpdate = {
  user_answer?: string | null;
  is_correct?: boolean | null;
  time_spent_sec?: number;
};

/* -------------------------------------------------------------------------- */
/*  Database types (cast scoped)                                              */
/* -------------------------------------------------------------------------- */

export type StemDatabase = {
  public: {
    Tables: {
      stem_quiz_sessions: {
        Row: StemSessionRow;
        Insert: StemSessionInsert;
        Update: StemSessionUpdate;
        Relationships: [];
      };
      stem_quiz_questions: {
        Row: StemQuestionRow;
        Insert: StemQuestionInsert;
        Update: StemQuestionUpdate;
        Relationships: [];
      };
      stem_bookmarks: {
        Row: StemBookmarkRow;
        Insert: StemBookmarkInsert;
        Update: StemBookmarkUpdate;
        Relationships: [];
      };
    };
    Views: {
      stem_weakness: { Row: WeaknessRow; Relationships: [] };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type StemDb = SupabaseClient<StemDatabase>;

/* -------------------------------------------------------------------------- */
/*  Runtime payloads                                                          */
/* -------------------------------------------------------------------------- */

export type SessionStartPayload = {
  subject: StemSubject;
  difficulty: StemDifficulty;
  mode: StemMode;
  topic: string | null;
  timeLimitSec: number | null;
};

export type SessionFinishPayload = {
  sessionId: string;
  correctCount: number;
  totalQuestions: number;
  durationSec: number;
};

export const SessionStartSchema = z.object({
  subject: SubjectSchema,
  difficulty: DifficultySchema,
  mode: ModeSchema,
  topic: z.string().max(400).nullable(),
  timeLimitSec: z.number().int().positive().nullable(),
});

export const SessionFinishSchema = z.object({
  sessionId: z.string().uuid(),
  correctCount: z.number().int().min(0),
  totalQuestions: z.number().int().min(1),
  durationSec: z.number().int().min(0),
});

export function computeScore(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 10000) / 100;
}