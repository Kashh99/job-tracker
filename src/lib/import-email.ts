import "server-only";
import { generateText, Output } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { today } from "./dates";
import {
  EXTRACTION_SYSTEM_PROMPT,
  companyKey,
  extractionSchema,
  normalizeExtraction,
  roleKey,
  type Extraction,
} from "./extract";
import { basicExtract } from "./extract-basic";
import type { Application, InboundEmail } from "./types";

// Cheap and accurate enough for pulling a few fields out of a short email.
// Routed through Vercel AI Gateway (OIDC on Vercel, AI_GATEWAY_API_KEY elsewhere).
const EXTRACTION_MODEL = "anthropic/claude-haiku-4.5";

export type EmailInput = {
  messageId: string | null;
  from: string | null;
  subject: string | null;
  text: string;
};

export type ImportResult = {
  status: InboundEmail["status"];
  detail: string;
  applicationId: string | null;
};

export async function extractFromEmail(email: EmailInput): Promise<Extraction> {
  const { output } = await generateText({
    model: EXTRACTION_MODEL,
    maxRetries: 1,
    system: EXTRACTION_SYSTEM_PROMPT,
    output: Output.object({ schema: extractionSchema }),
    prompt: [
      `From: ${email.from ?? "unknown"}`,
      `Subject: ${email.subject ?? "(none)"}`,
      `Today: ${today()}`,
      "",
      email.text,
    ].join("\n"),
  });
  return normalizeExtraction(output);
}

// Creates (or updates) an application from a confirmation email and logs the
// outcome. `supabase` may be a user-scoped client or the admin client, so every
// query filters by `userId` explicitly instead of relying on row level security.
export async function importEmail(
  supabase: SupabaseClient,
  userId: string,
  email: EmailInput,
): Promise<ImportResult> {
  if (email.messageId) {
    const { data: seen } = await supabase
      .from("inbound_emails")
      .select("status, detail, application_id")
      .eq("user_id", userId)
      .eq("message_id", email.messageId)
      .maybeSingle();
    if (seen) return { status: "duplicate", detail: "Email already processed", applicationId: seen.application_id };
  }

  // Prefer the AI extractor; if it is unavailable (no Gateway credits, outage),
  // fall back to pattern matching so imports keep working with fewer fields.
  let extraction: Extraction;
  let basic = false;
  try {
    extraction = await extractFromEmail(email);
  } catch (error) {
    console.warn("AI extraction unavailable, using basic extraction:", error instanceof Error ? error.message : error);
    extraction = basicExtract(email);
    basic = true;
  }

  let result: ImportResult;
  try {
    result = await applyExtraction(supabase, userId, email, extraction);
    if (basic) result.detail += " (basic extraction, AI unavailable)";
  } catch (error) {
    result = {
      status: "failed",
      detail: error instanceof Error ? error.message.slice(0, 300) : "Import failed",
      applicationId: null,
    };
  }

  const { error } = await supabase.from("inbound_emails").insert({
    user_id: userId,
    message_id: email.messageId,
    from_address: email.from?.slice(0, 320),
    subject: email.subject?.slice(0, 500),
    body_excerpt: email.text.slice(0, 2000),
    status: result.status,
    detail: result.detail,
    application_id: result.applicationId,
  });
  // 23505: a retry of the same message raced us; the first one wins.
  if (error && error.code !== "23505") throw new Error(error.message);
  return result;
}

async function applyExtraction(
  supabase: SupabaseClient,
  userId: string,
  email: EmailInput,
  x: Extraction,
): Promise<ImportResult> {
  if (!x.isApplicationConfirmation) {
    return { status: "skipped", detail: "Not an application confirmation", applicationId: null };
  }
  if (!x.company || !x.role) {
    return { status: "skipped", detail: "Could not find company and role", applicationId: null };
  }

  const { data: existing, error: listError } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId);
  if (listError) throw new Error(listError.message);

  const match = (existing as Application[]).find(
    (a) => companyKey(a.company) === companyKey(x.company!) && roleKey(a.role) === roleKey(x.role!),
  );

  const fields = {
    location: x.location,
    work_mode: x.workMode,
    salary: x.salary,
    job_ref: x.jobRef,
    job_url: x.jobUrl,
    source: x.source,
  };

  // A saved job you just applied to: move it to Applied and fill in blanks.
  if (match?.status === "saved") {
    const blanks = Object.fromEntries(
      Object.entries(fields).filter(([key, value]) => value !== null && match[key as keyof Application] === null),
    );
    const { error } = await supabase
      .from("applications")
      .update({ ...blanks, status: "applied", applied_date: x.appliedDate ?? today(), needs_review: true })
      .eq("id", match.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    await logImportNote(supabase, match.id, email);
    return { status: "imported", detail: `Moved saved ${x.company} to Applied`, applicationId: match.id };
  }
  if (match) {
    return { status: "duplicate", detail: `Already tracking ${x.company} — ${x.role}`, applicationId: match.id };
  }

  const { data: created, error } = await supabase
    .from("applications")
    .insert({
      ...fields,
      user_id: userId,
      company: x.company,
      role: x.role,
      status: "applied",
      applied_date: x.appliedDate ?? today(),
      needs_review: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await logImportNote(supabase, created.id, email);
  if (x.contact) {
    await supabase.from("contacts").insert({
      user_id: userId,
      application_id: created.id,
      name: x.contact.name,
      email: x.contact.email,
      role: x.contact.role,
      company: x.company,
    });
  }
  return { status: "imported", detail: `Added ${x.company} — ${x.role}`, applicationId: created.id };
}

async function logImportNote(supabase: SupabaseClient, applicationId: string, email: EmailInput) {
  await supabase.from("events").insert({
    application_id: applicationId,
    type: "note",
    detail: `Imported from email${email.subject ? `: ${email.subject.slice(0, 200)}` : ""}`,
  });
}
