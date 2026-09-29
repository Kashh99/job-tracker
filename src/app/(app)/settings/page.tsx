import Link from "next/link";
import { headers } from "next/headers";
import { rotateInboxToken, updateFollowUpDays } from "@/app/actions";
import { getFollowUpDays } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";
import type { InboundEmail } from "@/lib/types";

const STATUS_TONE: Record<InboundEmail["status"], string> = {
  imported: "bg-ok-bg text-ok",
  duplicate: "",
  skipped: "bg-warn-bg text-warn",
  failed: "bg-danger/10 text-danger",
};

// "inbox@inbound.example.com" + token -> "inbox+token@inbound.example.com"
function forwardingAddress(base: string | undefined, token: string): string | null {
  const at = base?.lastIndexOf("@") ?? -1;
  return base && at > 0 ? `${base.slice(0, at)}+${token}${base.slice(at)}` : null;
}

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const [days, profileRes, emailsRes, h] = await Promise.all([
    getFollowUpDays(),
    supabase.from("users").select("inbox_token").eq("id", user.id).single(),
    supabase
      .from("inbound_emails")
      .select("id, from_address, subject, body_excerpt, status, detail, application_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    headers(),
  ]);
  const token: string | undefined = profileRes.data?.inbox_token;
  const emails = (emailsRes.data ?? []) as InboundEmail[];
  const address = token ? forwardingAddress(process.env.INBOUND_EMAIL_ADDRESS, token) : null;
  const proto = h.get("x-forwarded-proto") ?? "https";
  const webhook = token ? `${proto}://${h.get("host")}/api/inbound?token=${token}` : null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <form action={updateFollowUpDays} className="card space-y-3 p-5">
        <h2 className="font-semibold">Follow-up reminders</h2>
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

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Import from email</h2>
          <p className="text-sm text-muted">
            Forward &quot;thanks for applying&quot; emails here and they land on the board automatically,
            marked for review. In Gmail, add a filter (e.g. subject contains &quot;application&quot;) that forwards to this address.
          </p>
        </div>
        {address ? (
          <Copyable label="Forwarding address" value={address} />
        ) : (
          <p className="rounded-md bg-warn-bg p-2.5 text-sm text-warn">
            No inbound address configured. Set <code>INBOUND_EMAIL_ADDRESS</code> (see README), or point your
            provider at the webhook below.
          </p>
        )}
        {webhook && <Copyable label="Webhook URL" value={webhook} />}
        <form action={rotateInboxToken} className="flex items-center gap-3">
          <button className="btn">Rotate secret</button>
          <span className="text-xs text-muted">Anyone with the address can add applications. Rotate it if it leaks.</span>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-semibold">Recent imports</h2>
        <p className="mb-3 text-sm text-muted">
          Every email received, including skipped ones. Gmail&apos;s forwarding confirmation code shows up here.
        </p>
        <ul className="divide-y divide-border text-sm">
          {emails.map((e) => (
            <li key={e.id} className="py-2.5">
              <div className="flex items-center gap-2">
                <span className={`chip ${STATUS_TONE[e.status]}`}>{e.status}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{e.subject ?? "Pasted email"}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted">{e.created_at.slice(0, 10)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {e.detail}
                {e.application_id && (
                  <>
                    {" · "}
                    <Link href={`/applications/${e.application_id}`} className="text-accent hover:underline">Open</Link>
                  </>
                )}
              </p>
              {e.status === "skipped" && e.body_excerpt && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-muted">Show email</summary>
                  <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-background p-2 text-xs">{e.body_excerpt}</pre>
                </details>
              )}
            </li>
          ))}
          {emails.length === 0 && <li className="py-2.5 text-muted">Nothing imported yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function Copyable({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <input className="input font-mono text-xs" readOnly value={value} aria-label={label} />
    </div>
  );
}
