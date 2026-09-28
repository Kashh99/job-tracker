import { updateFollowUpDays } from "@/app/actions";
import { getFollowUpDays } from "@/lib/data";

export default async function SettingsPage() {
  const days = await getFollowUpDays();
  return (
    <form action={updateFollowUpDays} className="card max-w-md space-y-3 p-4">
      <h1 className="text-sm font-semibold">Follow-up reminders</h1>
      <p className="text-sm text-muted">
        Flag an application in Applied once it has had no activity for this many days.
      </p>
      <div className="flex items-end gap-2">
        <div className="w-24">
          <label className="label" htmlFor="follow_up_days">Days</label>
          <input className="input" id="follow_up_days" name="follow_up_days" type="number" min={1} max={90} defaultValue={days} required />
        </div>
        <button className="btn btn-primary">Save</button>
      </div>
    </form>
  );
}
