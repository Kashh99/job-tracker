"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { today } from "@/lib/dates";
import { EVENT_TYPES, SOURCES, STATUSES, type EventType, type Source, type Status } from "@/lib/types";

function text(form: FormData, key: string): string | null {
  const value = form.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

// Applications

export async function createApplication(form: FormData) {
  const { supabase } = await requireUser();
  const company = text(form, "company");
  const role = text(form, "role");
  if (!company || !role) throw new Error("Company and role are required");

  const { error } = await supabase.from("applications").insert({
    company,
    role,
    job_url: text(form, "job_url"),
    source: oneOf<Source>(text(form, "source"), SOURCES),
    status: oneOf<Status>(text(form, "status"), STATUSES) ?? "applied",
    applied_date: text(form, "applied_date"),
  });
  check(error);
  revalidatePath("/");
}

export async function updateApplication(id: string, form: FormData) {
  const { supabase } = await requireUser();
  const company = text(form, "company");
  const role = text(form, "role");
  if (!company || !role) throw new Error("Company and role are required");

  const { error } = await supabase
    .from("applications")
    .update({
      company,
      role,
      job_url: text(form, "job_url"),
      source: oneOf<Source>(text(form, "source"), SOURCES),
      status: oneOf<Status>(text(form, "status"), STATUSES) ?? "applied",
      applied_date: text(form, "applied_date"),
      resume_version: text(form, "resume_version"),
      notes: text(form, "notes"),
    })
    .eq("id", id);
  check(error);
  revalidatePath("/", "layout");
}

export async function moveApplication(id: string, status: Status) {
  if (!STATUSES.includes(status)) throw new Error("Invalid status");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("applications").update({ status }).eq("id", id);
  check(error);
  revalidatePath("/", "layout");
}

export async function deleteApplication(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("applications").delete().eq("id", id);
  check(error);
  revalidatePath("/", "layout");
  redirect("/");
}

// Events

export async function addEvent(applicationId: string, form: FormData) {
  const { supabase } = await requireUser();
  const type = oneOf<EventType>(text(form, "type"), EVENT_TYPES);
  if (!type || type === "status_change") throw new Error("Invalid event type");
  const eventDate = text(form, "event_date") ?? today();

  const { error } = await supabase.from("events").insert({
    application_id: applicationId,
    type,
    detail: text(form, "detail"),
    event_date: eventDate,
  });
  check(error);

  // Follow-ups and interviews count as activity and reset the reminder clock.
  if (type !== "note") await touchApplication(applicationId, eventDate);
  revalidatePath("/", "layout");
}

export async function markFollowedUp(applicationId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("events")
    .insert({ application_id: applicationId, type: "follow_up", detail: "Followed up" });
  check(error);
  await touchApplication(applicationId, today());
  revalidatePath("/", "layout");
}

async function touchApplication(id: string, day: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("applications")
    .update({ last_activity_date: day })
    .eq("id", id)
    .lt("last_activity_date", day);
  check(error);
}

export async function deleteEvent(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("events").delete().eq("id", id);
  check(error);
  revalidatePath("/", "layout");
}

// Contacts

export async function createContact(form: FormData) {
  const { supabase } = await requireUser();
  const name = text(form, "name");
  if (!name) throw new Error("Name is required");

  const { error } = await supabase.from("contacts").insert({
    name,
    role: text(form, "role"),
    company: text(form, "company"),
    email: text(form, "email"),
    notes: text(form, "notes"),
    application_id: text(form, "application_id"),
  });
  check(error);
  revalidatePath("/", "layout");
}

export async function linkContact(contactId: string, applicationId: string | null) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("contacts")
    .update({ application_id: applicationId })
    .eq("id", contactId);
  check(error);
  revalidatePath("/", "layout");
}

export async function deleteContact(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  check(error);
  revalidatePath("/", "layout");
}

// Settings and auth

export async function updateFollowUpDays(form: FormData) {
  const { supabase, user } = await requireUser();
  const days = Number(text(form, "follow_up_days"));
  if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error("Pick 1-90 days");
  const { error } = await supabase.from("users").update({ follow_up_days: days }).eq("id", user.id);
  check(error);
  revalidatePath("/", "layout");
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/login");
}
