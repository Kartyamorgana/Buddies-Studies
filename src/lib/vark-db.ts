// src/lib/vark-db.ts
import { supabase } from "@/integrations/supabase/client";
import type {
  KinestheticInsert,
  KinestheticKind,
  KinestheticRow,
  KinestheticUpdate,
  PodcastInsert,
  PodcastRow,
  VarkDb,
} from "./vark-schema";

const db = () => supabase as unknown as VarkDb;

/* ------------------------------ Podcasts --------------------------------- */

export async function savePodcast(input: PodcastInsert): Promise<PodcastRow> {
  const { data, error } = await db()
    .from("vark_podcasts")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchPodcasts(limit = 30): Promise<PodcastRow[]> {
  const { data, error } = await db()
    .from("vark_podcasts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function deletePodcast(id: string): Promise<void> {
  const { error } = await db().from("vark_podcasts").delete().eq("id", id);
  if (error) throw error;
}

/* ----------------------------- Kinesthetic ------------------------------- */

export async function saveKinesthetic(
  input: KinestheticInsert,
): Promise<KinestheticRow> {
  const { data, error } = await db()
    .from("vark_kinesthetic_progress")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateKinesthetic(
  id: string,
  patch: KinestheticUpdate,
): Promise<void> {
  const { error } = await db()
    .from("vark_kinesthetic_progress")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export async function fetchKinesthetic(
  kind?: KinestheticKind,
  limit = 30,
): Promise<KinestheticRow[]> {
  let q = db()
    .from("vark_kinesthetic_progress")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (kind) q = q.eq("kind", kind);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function deleteKinesthetic(id: string): Promise<void> {
  const { error } = await db()
    .from("vark_kinesthetic_progress")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
