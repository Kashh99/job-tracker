import { requireUser } from "./supabase/server";
import { DEFAULT_FOLLOW_UP_DAYS } from "./follow-up";
import type { Application } from "./types";

export async function getFollowUpDays(): Promise<number> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("users").select("follow_up_days").eq("id", user.id).single();
  return data?.follow_up_days ?? DEFAULT_FOLLOW_UP_DAYS;
}

export async function getApplications(): Promise<Application[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .order("last_activity_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
