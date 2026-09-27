import { supabase } from "@/integrations/supabase/client";

export type Folder = {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  folder_id: string | null;
  pinned: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
};

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

async function requireUserId(): Promise<string> {
  const id = await getCurrentUserId();
  if (!id) throw new Error("Silakan masuk terlebih dahulu");
  return id;
}

export async function fetchAll() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { folders: [] as Folder[], notes: [] as Note[] };
  }

  const [foldersRes, notesRes] = await Promise.all([
    supabase
      .from("folders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at"),
    supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
  ]);
  if (foldersRes.error) throw foldersRes.error;
  if (notesRes.error) throw notesRes.error;
  return {
    folders: (foldersRes.data ?? []) as Folder[],
    notes: (notesRes.data ?? []) as Note[],
  };
}

export async function createFolder(
  name: string,
  parent_id: string | null = null,
) {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("folders")
    .insert({ name, parent_id, user_id })
    .select()
    .single();
  if (error) throw error;
  return data as Folder;
}

export async function renameFolder(id: string, name: string) {
  const user_id = await requireUserId();
  const { error } = await supabase
    .from("folders")
    .update({ name })
    .eq("id", id)
    .eq("user_id", user_id);
  if (error) throw error;
}

export async function deleteFolder(id: string) {
  const user_id = await requireUserId();
  const { error } = await supabase
    .from("folders")
    .delete()
    .eq("id", id)
    .eq("user_id", user_id);
  if (error) throw error;
}

export async function createNote(folder_id: string | null) {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("notes")
    .insert({ title: "Untitled", content: "", folder_id, user_id })
    .select()
    .single();
  if (error) throw error;
  return data as Note;
}

export async function updateNote(id: string, patch: Partial<Note>) {
  const user_id = await requireUserId();
  const { error } = await supabase
    .from("notes")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user_id);
  if (error) throw error;
}

export async function deleteNote(id: string) {
  const user_id = await requireUserId();
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user_id);
  if (error) throw error;
}