// src/lib/vark-schema.ts
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------ Auditory --------------------------------- */

export const PodcastLineSchema = z.object({
  speaker: z.enum(["A", "B"]),
  name: z.string().min(1).max(60),
  text: z.string().min(1),
});
export type PodcastLine = z.infer<typeof PodcastLineSchema>;

export const PodcastScriptSchema = z.object({
  title: z.string().min(1),
  summary: z.string().default(""),
  lines: z.array(PodcastLineSchema).min(2),
});
export type PodcastScript = z.infer<typeof PodcastScriptSchema>;

export type PodcastRow = {
  id: string;
  user_id: string;
  title: string;
  source_kind: string;
  source_ref: string | null;
  material: string;
  script: PodcastScript;
  created_at: string;
};

export type PodcastInsert = {
  title: string;
  source_kind: string;
  source_ref?: string | null;
  material: string;
  script: PodcastScript;
};

/* ----------------------------- Kinesthetic ------------------------------- */

export const StepBlockSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  explain: z.string().default(""),
});
export type StepBlock = z.infer<typeof StepBlockSchema>;

export const StepPuzzleSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().default(""),
  steps: z.array(StepBlockSchema).min(3),
});
export type StepPuzzle = z.infer<typeof StepPuzzleSchema>;

export const FlashcardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

export const FlashcardDeckSchema = z.object({
  title: z.string().min(1),
  cards: z.array(FlashcardSchema).min(3),
});
export type FlashcardDeck = z.infer<typeof FlashcardDeckSchema>;

export const SimParamSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  value: z.number(),
  unit: z.string().default(""),
});
export type SimParam = z.infer<typeof SimParamSchema>;

export const SimulationSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  // Rumus dalam sintaks JS sederhana, mis. "0.5*m*v*v"
  formula: z.string().min(1),
  outputLabel: z.string().default("Hasil"),
  outputUnit: z.string().default(""),
  xKey: z.string().min(1),
  params: z.array(SimParamSchema).min(1),
});
export type Simulation = z.infer<typeof SimulationSchema>;

export type KinestheticKind = "puzzle" | "flashcard" | "simulation";

export type KinestheticRow = {
  id: string;
  user_id: string;
  kind: KinestheticKind;
  topic: string;
  title: string;
  payload: Record<string, unknown>;
  score: number;
  total: number;
  completed: boolean;
  created_at: string;
};

export type KinestheticInsert = {
  kind: KinestheticKind;
  topic: string;
  title: string;
  payload: Record<string, unknown>;
  score?: number;
  total?: number;
  completed?: boolean;
};

export type KinestheticUpdate = {
  score?: number;
  total?: number;
  completed?: boolean;
  payload?: Record<string, unknown>;
};

/* --------------------------- Scoped DB types ----------------------------- */

export type VarkDatabase = {
  public: {
    Tables: {
      vark_podcasts: {
        Row: PodcastRow;
        Insert: PodcastInsert;
        Update: Partial<PodcastInsert>;
        Relationships: [];
      };
      vark_kinesthetic_progress: {
        Row: KinestheticRow;
        Insert: KinestheticInsert;
        Update: KinestheticUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type VarkDb = SupabaseClient<VarkDatabase>;

/** Evaluasi rumus simulasi secara aman (hanya angka + Math). */
export function evalFormula(
  formula: string,
  vars: Record<string, number>,
): number | null {
  if (!/^[0-9a-zA-Z_+\-*/().,^%\s]+$/.test(formula)) return null;
  const js = formula.replace(/\^/g, "**");
  const keys = Object.keys(vars);
  try {
    const fn = new Function(...keys, "Math", `"use strict"; return (${js});`) as (
      ...a: unknown[]
    ) => unknown;
    const out = fn(...keys.map((k) => vars[k]), Math);
    return typeof out === "number" && Number.isFinite(out) ? out : null;
  } catch {
    return null;
  }
}
