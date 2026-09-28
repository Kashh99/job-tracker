import { requireUser } from "@/lib/supabase/server";
import { computeAnalytics } from "@/lib/analytics";
import { today } from "@/lib/dates";
import { SOURCE_LABELS, type AppEvent, type Application, type Source } from "@/lib/types";
import { BarChartCard } from "./charts";

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default async function AnalyticsPage() {
  const { supabase } = await requireUser();
  const [appsRes, eventsRes] = await Promise.all([
    supabase.from("applications").select("id, company, source, status, applied_date"),
    supabase.from("events").select("application_id, type, detail, event_date"),
  ]);
  const apps = (appsRes.data ?? []) as Pick<Application, "id" | "company" | "source" | "status" | "applied_date">[];
  const events = (eventsRes.data ?? []) as Pick<AppEvent, "application_id" | "type" | "detail" | "event_date">[];
  const a = computeAnalytics(apps, events, today());
  const applied = a.funnel[0].count;

  if (applied === 0) {
    return <p className="text-muted">No applications yet. Add some on the board and patterns show up here.</p>;
  }

  const sourceLabel = (s: string) => SOURCE_LABELS[s as Source] ?? "Unknown";

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Applications sent" value={String(applied)} />
        <Stat label="Response rate" value={pct(a.responseRate)} hint="Moved to interview, offer or rejected" />
        <Stat
          label="Median days to reply"
          value={a.medianDaysToReply === null ? "—" : String(a.medianDaysToReply)}
          hint="From applying to first response"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarChartCard
          title="Funnel"
          subtitle="Applications that reached each stage"
          data={a.funnel.map((f) => ({
            label: f.stage,
            value: f.count,
            tip: `${f.count} (${pct(f.count / applied)} of applied)`,
          }))}
        />
        <BarChartCard
          title="Applications per week"
          subtitle="Last 12 weeks, by date applied"
          data={a.perWeek.map((w) => ({ label: w.week.slice(5), value: w.count, tip: `Week of ${w.week}: ${w.count}` }))}
        />
        <BarChartCard
          title="Response rate by source"
          subtitle="Share of applications that got a response"
          percent
          data={a.bySource.map((r) => ({
            label: sourceLabel(r.name),
            value: r.rate,
            tip: `${r.responded} of ${r.applied} (${pct(r.rate)})`,
          }))}
        />
        <RateTable title="Response rate by company" rows={a.byCompany} />
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function RateTable({ title, rows }: { title: string; rows: { name: string; applied: number; responded: number; rate: number }[] }) {
  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mb-3 text-xs text-muted">Top 10 by applications sent</p>
      <table className="w-full text-sm">
        <thead className="text-xs text-muted">
          <tr>
            <th className="py-1 text-left font-medium">Company</th>
            <th className="py-1 text-right font-medium">Applied</th>
            <th className="py-1 text-right font-medium">Responded</th>
            <th className="py-1 text-right font-medium">Rate</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-border">
              <td className="py-1.5">{r.name}</td>
              <td className="py-1.5 text-right">{r.applied}</td>
              <td className="py-1.5 text-right">{r.responded}</td>
              <td className="py-1.5 text-right">{pct(r.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
