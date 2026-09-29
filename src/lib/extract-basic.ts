import { normalizeExtraction, type Extraction } from "./extract";
import type { Source, WorkMode } from "./types";

// Pattern-based fallback for when the AI extractor is unavailable. Covers the
// usual ATS templates (Workday, Greenhouse, Lever, Ashby, LinkedIn, Indeed);
// anything it cannot find stays null for the user to fill in.

const CONFIRMATION =
  /thanks? (you )?for (applying|your application|your interest|submitting)|application (has been |was |is )?(received|submitted|sent|complete)|(we'?ve|we have) received your application|successfully (applied|submitted)|you applied (to|for)|applied (to|for) .{2,80} at /i;
const REJECTION =
  /unfortunately|not (to )?(be )?mov(e|ing) forward|decided to (pursue|proceed with) other|we regret|no longer (under )?consider/i;

// Senders that are the ATS or job board, never the hiring company.
const VENDORS =
  /^(workday|greenhouse|lever|ashby|icims|jobvite|smartrecruiters|taleo|bamboohr|linkedin|indeed|glassdoor|ziprecruiter|workable|recruitee|no-?reply|noreply|do-?not-?reply|careers|jobs|recruiting|talent|hr)$/i;
const SENDER_SUFFIX =
  /\s+(careers?|jobs|recruiting|recruitment|talent( acquisition)?( team)?|hiring( team)?|hr|people( team)?|team|via .+|notifications?)$/i;

const STOP = String.raw`(?=\s+(?:role|position|job|opening|and|has|have|was|is|we|in|on|from|\(|-|–|—)\b|[.!,;:\n(]|$)`;
const NAME = String.raw`([A-Z0-9][\w&'’.+/-]*(?:[ \t]+(?:[A-Z0-9&][\w&'’.+/-]*|of|and|for|the|de))*)`;
const ROLE = String.raw`([A-Za-z][\w&'’/,+#.()-]*(?:[ \t]+[\w&'’/,+#.()-]+){0,9}?)`;

// Order matters: "ROLE at COMPANY" sentences give both fields at once.
const ROLE_AT_COMPANY = [
  new RegExp(String.raw`(?:applying|applied|application|apply)\s+(?:to|for)\s+(?:the\s+)?(?:position of\s+)?${ROLE}\s+(?:role|position|job|opening)?\s*(?:at|with)\s+${NAME}${STOP}`, "i"),
  new RegExp(String.raw`interest in (?:the\s+)?${ROLE}\s+(?:role|position|job|opening)\s+(?:at|with)\s+${NAME}${STOP}`, "i"),
];
const COMPANY = [
  new RegExp(String.raw`(?:applying|applied|application|apply|interest)\s+(?:to|at|in|with)\s+${NAME}${STOP}`),
  new RegExp(String.raw`(?:application was sent to|thank you from|welcome to|career opportunities at|opportunities with)\s+${NAME}${STOP}`, "i"),
  new RegExp(String.raw`(?:^|\n)\s*(?:Company|Employer|Organization)\s*:\s*([^\n]+)`, "i"),
];
const ROLE_ONLY = [
  new RegExp(String.raw`(?:^|\n)\s*(?:Job Title|Position|Role|Job)\s*:\s*([^\n]+)`, "i"),
  new RegExp(String.raw`(?:application|applying|applied|apply)\s+for\s+(?:the\s+)?(?:position of\s+)?${ROLE}(?:\s+(?:role|position|job|opening))?${STOP}`, "i"),
  new RegExp(String.raw`interest in (?:the\s+)?${ROLE}\s+(?:role|position|job|opening)`, "i"),
];

function tidy(value: string | undefined, maxWords: number): string | null {
  const cleaned = value
    ?.replace(/^["'“‘\s]+|["'”’\s.!,;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.split(" ").length > maxWords || VENDORS.test(cleaned)) return null;
  return cleaned;
}

function firstMatch(patterns: RegExp[], text: string, maxWords: number): string | null {
  for (const p of patterns) {
    const value = tidy(text.match(p)?.[1], maxWords);
    if (value) return value;
  }
  return null;
}

// "Acme Careers <no-reply@myworkday.com>" -> "Acme"
export function companyFromSender(from: string | null): string | null {
  const display = from?.match(/^\s*"?([^"<]+?)"?\s*</)?.[1];
  return tidy(display?.replace(SENDER_SUFFIX, "").replace(SENDER_SUFFIX, ""), 5);
}

function workMode(text: string): WorkMode | null {
  const head = text.slice(0, 2000);
  if (/\bhybrid\b/i.test(head)) return "hybrid";
  if (/\b(on-?site|in-office)\b/i.test(head)) return "onsite";
  if (/\(remote\)|\bremote\b\s*(role|position|-|–|,|\))|location\s*:\s*remote/i.test(head)) return "remote";
  return null;
}

function source(from: string | null, text: string): Source | null {
  const all = `${from ?? ""}\n${text}`;
  if (/linkedin/i.test(all)) return "linkedin";
  if (/indeed|glassdoor|ziprecruiter|wellfound|angel\.co|monster\.com|dice\.com/i.test(all)) return "job_board";
  return null;
}

export function basicExtract(email: { from: string | null; subject: string | null; text: string }): Extraction {
  const text = `${email.subject ?? ""}\n${email.text}`;

  let role: string | null = null;
  let company: string | null = null;
  for (const p of ROLE_AT_COMPANY) {
    const m = text.match(p);
    if (m) {
      role = tidy(m[1], 10);
      company = tidy(m[2], 6);
      if (role && company) break;
    }
  }
  company ??= firstMatch(COMPANY, text, 6) ?? companyFromSender(email.from);
  role ??= firstMatch(ROLE_ONLY, text, 10);

  const url = text.match(/https?:\/\/[^\s)>"']*(?:job|career|apply|application|myworkdayjobs|greenhouse|lever\.co|ashbyhq)[^\s)>"']*/i)?.[0];

  return normalizeExtraction({
    isApplicationConfirmation: CONFIRMATION.test(text) && !REJECTION.test(text),
    company,
    role,
    location: text.match(/(?:^|\n)\s*Location\s*:\s*([^\n]+)/i)?.[1] ?? null,
    workMode: workMode(text),
    salary:
      text.match(/(?:[A-Z]{3}\s?)?\$\s?\d[\d,]*(?:\.\d+)?\s?[kK]?\s?(?:-|–|to)\s?(?:[A-Z]{3}\s?)?\$?\s?\d[\d,]*(?:\.\d+)?\s?[kK]?/)?.[0] ??
      null,
    jobRef:
      text.match(/(?:req(?:uisition)?\.?\s*(?:id|#|number|no\.?)?|job\s*(?:id|#|number|no\.?)|reference\s*(?:id|#|number)?)\s*[:#]?\s*((?=[A-Z0-9_-]*\d)[A-Z0-9][A-Z0-9_-]{2,})/i)?.[1] ??
      null,
    jobUrl: url ?? null,
    appliedDate: null,
    source: source(email.from, text),
    contactName: null,
    contactEmail: null,
    contactRole: null,
  });
}
