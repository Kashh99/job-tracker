const DAY_MS = 86_400_000;

// Dates are stored as Postgres `date` values ("YYYY-MM-DD"); treat them as UTC days.
export function parseDay(day: string): number {
  return Date.parse(`${day}T00:00:00Z`);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDay(to) - parseDay(from)) / DAY_MS);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function weekStart(day: string): string {
  const d = new Date(parseDay(day));
  const offset = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(d.getTime() - offset * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  return new Date(parseDay(day) + n * DAY_MS).toISOString().slice(0, 10);
}
