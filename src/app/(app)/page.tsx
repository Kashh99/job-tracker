import { getApplications, getFollowUpDays } from "@/lib/data";
import { needsFollowUp } from "@/lib/follow-up";
import { today } from "@/lib/dates";
import { AddPanel } from "./add-panel";
import { Board } from "./board";
import { FollowUps } from "./follow-ups";

export default async function BoardPage() {
  const [apps, followUpDays] = await Promise.all([getApplications(), getFollowUpDays()]);
  const day = today();
  const stale = apps.filter((a) => needsFollowUp(a, followUpDays, day));
  const count = (pred: (a: (typeof apps)[number]) => boolean) => apps.filter(pred).length;

  const stats = [
    { label: "Active", value: count((a) => a.status === "applied" || a.status === "interviewing") },
    { label: "Interviewing", value: count((a) => a.status === "interviewing") },
    { label: "Offers", value: count((a) => a.status === "offer") },
    { label: "To review", value: count((a) => a.needs_review) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Board</h1>
          <p className="text-sm text-muted">{apps.length} applications tracked</p>
        </div>
        <dl className="flex flex-wrap gap-2">
          {stats.map((s) => (
            <div key={s.label} className="card min-w-24 px-3 py-2">
              <dt className="text-xs text-muted">{s.label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <AddPanel />
      {stale.length > 0 && <FollowUps apps={stale} day={day} />}
      <Board apps={apps} staleIds={stale.map((a) => a.id)} day={day} />
    </div>
  );
}
