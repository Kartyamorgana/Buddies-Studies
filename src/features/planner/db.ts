// Data akses untuk rencana belajar adaptif.
import { supabase } from "@/integrations/supabase/client";

export type PlanRow = {
  id: string;
  title: string;
  exam_date: string;
  daily_minutes: number;
  target_label: string;
  is_active: boolean;
  created_at: string;
};

export type TaskRow = {
  id: string;
  plan_id: string;
  task_date: string;
  subject: string;
  topic: string;
  title: string;
  detail: string;
  minutes: number;
  ord: number;
  done: boolean;
};

export async function fetchActivePlan(): Promise<PlanRow | null> {
  const { data, error } = await supabase
    .from("user_study_plans")
    .select("id, title, exam_date, daily_minutes, target_label, is_active, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0] as PlanRow | undefined) ?? null;
}

export async function fetchTasks(planId: string): Promise<TaskRow[]> {
  const { data, error } = await supabase
    .from("user_study_tasks")
    .select("id, plan_id, task_date, subject, topic, title, detail, minutes, ord, done")
    .eq("plan_id", planId)
    .order("task_date", { ascending: true })
    .order("ord", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TaskRow[];
}

export async function toggleTask(id: string, done: boolean) {
  const { error } = await supabase
    .from("user_study_tasks")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export type NewTask = {
  task_date: string;
  subject: string;
  topic: string;
  title: string;
  detail: string;
  minutes: number;
  ord: number;
};

/** Nonaktifkan rencana lama lalu simpan rencana baru beserta agenda hariannya. */
export async function replacePlan(
  plan: { title: string; examDate: string; dailyMinutes: number; targetLabel: string; weaknesses: unknown },
  tasks: NewTask[],
): Promise<PlanRow> {
  const off = await supabase
    .from("user_study_plans")
    .update({ is_active: false })
    .eq("is_active", true);
  if (off.error) throw off.error;

  const { data, error } = await supabase
    .from("user_study_plans")
    .insert({
      title: plan.title,
      exam_date: plan.examDate,
      daily_minutes: plan.dailyMinutes,
      target_label: plan.targetLabel,
      weaknesses: plan.weaknesses as never,
      is_active: true,
    })
    .select("id, title, exam_date, daily_minutes, target_label, is_active, created_at")
    .single();
  if (error) throw error;

  const row = data as PlanRow;
  if (tasks.length) {
    const ins = await supabase
      .from("user_study_tasks")
      .insert(tasks.map((t) => ({ ...t, plan_id: row.id })));
    if (ins.error) throw ins.error;
  }
  return row;
}

/** Hitung rentetan hari berturut-turut dengan minimal satu tugas selesai. */
export function computeStreak(tasks: TaskRow[]): number {
  const doneDays = new Set(tasks.filter((t) => t.done).map((t) => t.task_date));
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 400; i++) {
    const key = d.toISOString().slice(0, 10);
    if (doneDays.has(key)) streak += 1;
    else if (i > 0 || !doneDays.size) break;
    else break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
