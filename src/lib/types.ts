export const STATUSES = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "ghosted",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
};

export const SOURCES = ["referral", "cold", "linkedin", "job_board", "other"] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_LABELS: Record<Source, string> = {
  referral: "Referral",
  cold: "Cold",
  linkedin: "LinkedIn",
  job_board: "Job board",
  other: "Other",
};

export const EVENT_TYPES = ["status_change", "follow_up", "interview", "note"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type Application = {
  id: string;
  user_id: string;
  company: string;
  role: string;
  job_url: string | null;
  source: Source | null;
  status: Status;
  applied_date: string | null;
  last_activity_date: string;
  resume_version: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  user_id: string;
  application_id: string | null;
  name: string;
  role: string | null;
  company: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
};

export type AppEvent = {
  id: string;
  application_id: string;
  type: EventType;
  detail: string | null;
  event_date: string;
  created_at: string;
};
