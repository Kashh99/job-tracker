import { getApplications, getFollowUpDays } from "@/lib/data";
import { needsFollowUp } from "@/lib/follow-up";
import { today } from "@/lib/dates";
import { QuickAdd } from "./quick-add";
import { Board } from "./board";
import { FollowUps } from "./follow-ups";

export default async function BoardPage() {
  const [apps, followUpDays] = await Promise.all([getApplications(), getFollowUpDays()]);
  const day = today();
  const stale = apps.filter((a) => needsFollowUp(a, followUpDays, day));

  return (
    <div className="space-y-6">
      <QuickAdd />
      {stale.length > 0 && <FollowUps apps={stale} day={day} />}
      <Board apps={apps} staleIds={stale.map((a) => a.id)} />
    </div>
  );
}
