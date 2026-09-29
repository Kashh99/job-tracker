import { daysBetween } from "./dates";
import type { Status } from "./types";

export const statusColor = (status: Status) => `var(--status-${status})`;

// "today", "yesterday", "5d ago", "3w ago", or the date itself once it is old.
export function relativeDay(day: string, onDay: string): string {
  const days = daysBetween(day, onDay);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return day;
}

// Stable hue per company so the same company always gets the same avatar.
export function companyHue(company: string): number {
  let hash = 0;
  for (const ch of company.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % 360;
}
