import Link from "next/link";
import { markFollowedUp } from "@/app/actions";
import { daysIdle } from "@/lib/follow-up";
import type { Application } from "@/lib/types";

export function FollowUps({ apps, day }: { apps: Application[]; day: string }) {
  return (
    <section className="rounded-lg border border-warn/40 bg-warn-bg p-3">
      <h2 className="mb-2 text-sm font-semibold text-warn">
        Follow up ({apps.length}) — no movement since applying
      </h2>
      <ul className="space-y-1.5">
        {apps.map((app) => (
          <li key={app.id} className="flex flex-wrap items-center gap-2 text-sm">
            <Link href={`/applications/${app.id}`} className="font-medium hover:underline">
              {app.company}
            </Link>
            <span className="text-muted">{app.role}</span>
            <span className="text-muted">· {daysIdle(app, day)} days idle</span>
            <form action={markFollowedUp.bind(null, app.id)} className="ml-auto">
              <button className="btn py-0.5 text-xs">Mark followed up</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
