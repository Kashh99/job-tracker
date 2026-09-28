import { addDays, daysBetween, weekStart } from "./dates";
import type { AppEvent, Application, Status } from "./types";

// A company "responded" once the application moved to any of these statuses.
const RESPONSE_STATUSES: ReadonlySet<Status> = new Set(["interviewing", "offer", "rejected"]);

type App = Pick<Application, "id" | "company" | "source" | "status" | "applied_date">;
type Ev = Pick<AppEvent, "application_id" | "type" | "detail" | "event_date">;

export type RateRow = { name: string; applied: number; responded: number; rate: number };

export type Analytics = {
  funnel: { stage: string; count: number }[];
  responseRate: number;
  medianDaysToReply: number | null;
  bySource: RateRow[];
  byCompany: RateRow[];
  perWeek: { week: string; count: number }[];
};

function statusHistory(app: App, events: Ev[]): Set<Status> {
  const seen = new Set<Status>([app.status]);
  for (const e of events) if (e.type === "status_change" && e.detail) seen.add(e.detail as Status);
  return seen;
}

function rateRows(groups: Map<string, { applied: number; responded: number }>): RateRow[] {
  return [...groups.entries()]
    .map(([name, g]) => ({ name, ...g, rate: g.applied ? g.responded / g.applied : 0 }))
    .sort((a, b) => b.applied - a.applied || a.name.localeCompare(b.name));
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function computeAnalytics(apps: App[], events: Ev[], onDay: string, weeks = 12): Analytics {
  const eventsByApp = new Map<string, Ev[]>();
  for (const e of events) {
    const list = eventsByApp.get(e.application_id) ?? [];
    list.push(e);
    eventsByApp.set(e.application_id, list);
  }

  let applied = 0;
  let interviewed = 0;
  let offers = 0;
  let responded = 0;
  const replyDays: number[] = [];
  const bySource = new Map<string, { applied: number; responded: number }>();
  const byCompany = new Map<string, { applied: number; responded: number }>();

  for (const app of apps) {
    const appEvents = eventsByApp.get(app.id) ?? [];
    const history = statusHistory(app, appEvents);
    if (!app.applied_date && [...history].every((s) => s === "saved")) continue;

    applied++;
    if (history.has("interviewing") || history.has("offer")) interviewed++;
    if (history.has("offer")) offers++;

    const didRespond = [...history].some((s) => RESPONSE_STATUSES.has(s));
    if (didRespond) {
      responded++;
      const firstReply = appEvents
        .filter((e) => e.type === "status_change" && RESPONSE_STATUSES.has(e.detail as Status))
        .map((e) => e.event_date)
        .sort()[0];
      if (firstReply && app.applied_date) replyDays.push(daysBetween(app.applied_date, firstReply));
    }

    const bump = (map: typeof bySource, key: string) => {
      const g = map.get(key) ?? { applied: 0, responded: 0 };
      g.applied++;
      if (didRespond) g.responded++;
      map.set(key, g);
    };
    bump(bySource, app.source ?? "unknown");
    bump(byCompany, app.company.trim());
  }

  const thisWeek = weekStart(onDay);
  const perWeek = Array.from({ length: weeks }, (_, i) => ({
    week: addDays(thisWeek, (i - weeks + 1) * 7),
    count: 0,
  }));
  const weekIndex = new Map(perWeek.map((w, i) => [w.week, i]));
  for (const app of apps) {
    if (!app.applied_date) continue;
    const i = weekIndex.get(weekStart(app.applied_date));
    if (i !== undefined) perWeek[i].count++;
  }

  return {
    funnel: [
      { stage: "Applied", count: applied },
      { stage: "Interview", count: interviewed },
      { stage: "Offer", count: offers },
    ],
    responseRate: applied ? responded / applied : 0,
    medianDaysToReply: median(replyDays),
    bySource: rateRows(bySource),
    byCompany: rateRows(byCompany).slice(0, 10),
    perWeek,
  };
}
