import { daysBetween } from "./dates";
import type { Application } from "./types";

export const DEFAULT_FOLLOW_UP_DAYS = 12;

// An application needs a follow-up when it sits in "Applied" with no activity
// for at least `followUpDays` days.
export function daysIdle(app: Pick<Application, "last_activity_date">, onDay: string): number {
  return daysBetween(app.last_activity_date, onDay);
}

export function needsFollowUp(
  app: Pick<Application, "status" | "last_activity_date">,
  followUpDays: number,
  onDay: string,
): boolean {
  return app.status === "applied" && daysIdle(app, onDay) >= followUpDays;
}
