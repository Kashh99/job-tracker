import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { today } from "@/lib/dates";
import {
  addEvent,
  deleteApplication,
  deleteEvent,
  linkContact,
  updateApplication,
} from "@/app/actions";
import {
  SOURCES,
  SOURCE_LABELS,
  STATUSES,
  STATUS_LABELS,
  type AppEvent,
  type Application,
  type Contact,
  type Status,
} from "@/lib/types";
import { ContactForm } from "@/components/contact-form";

const EVENT_LABELS: Record<AppEvent["type"], string> = {
  status_change: "Status",
  follow_up: "Follow-up",
  interview: "Interview",
  note: "Note",
};

export default async function ApplicationPage({ params }: PageProps<"/applications/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const [appRes, eventsRes, contactsRes] = await Promise.all([
    supabase.from("applications").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("events")
      .select("*")
      .eq("application_id", id)
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("contacts").select("*").order("name"),
  ]);
  const app = appRes.data as Application | null;
  if (!app) notFound();
  const events = (eventsRes.data ?? []) as AppEvent[];
  const contacts = (contactsRes.data ?? []) as Contact[];
  const linked = contacts.filter((c) => c.application_id === id);
  const unlinked = contacts.filter((c) => c.application_id !== id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <Link href="/" className="text-sm text-muted hover:text-foreground">← Board</Link>
        <h1 className="text-xl font-semibold">{app.company}</h1>
        <span className="text-muted">{app.role}</span>
        {app.job_url && (
          <a href={app.job_url} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
            Job post ↗
          </a>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <form action={updateApplication.bind(null, id)} className="card grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Company" name="company" defaultValue={app.company} required />
          <Field label="Role" name="role" defaultValue={app.role} required />
          <Field label="Job URL" name="job_url" type="url" defaultValue={app.job_url} />
          <div>
            <label className="label" htmlFor="source">Source</label>
            <select className="input" id="source" name="source" defaultValue={app.source ?? ""}>
              <option value="">—</option>
              {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select className="input" id="status" name="status" defaultValue={app.status}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <Field label="Date applied" name="applied_date" type="date" defaultValue={app.applied_date} />
          <Field label="Resume version" name="resume_version" defaultValue={app.resume_version} />
          <div className="sm:col-span-2">
            <label className="label" htmlFor="notes">Notes</label>
            <textarea className="input min-h-28" id="notes" name="notes" defaultValue={app.notes ?? ""} />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <button className="btn btn-primary">Save</button>
            <span className="text-xs text-muted">Last activity {app.last_activity_date}</span>
          </div>
        </form>

        <div className="space-y-6">
          <section className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
            <form action={addEvent.bind(null, id)} className="mb-4 space-y-2">
              <div className="flex gap-2">
                <select className="input" name="type" defaultValue="note" aria-label="Event type">
                  <option value="note">Note</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="interview">Interview</option>
                </select>
                <input className="input" type="date" name="event_date" defaultValue={today()} aria-label="Date" />
              </div>
              <div className="flex gap-2">
                <input className="input" name="detail" placeholder="What happened?" aria-label="Detail" />
                <button className="btn">Log</button>
              </div>
            </form>
            <ol className="space-y-2 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex gap-2">
                  <span className="w-20 shrink-0 tabular-nums text-muted">{e.event_date}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{EVENT_LABELS[e.type]}</span>{" "}
                    {e.type === "status_change" ? STATUS_LABELS[e.detail as Status] ?? e.detail : e.detail}
                  </span>
                  {e.type !== "status_change" && (
                    <form action={deleteEvent.bind(null, e.id)}>
                      <button className="text-xs text-muted hover:text-danger" aria-label="Delete event">✕</button>
                    </form>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">Contacts</h2>
            <ul className="mb-3 space-y-1.5 text-sm">
              {linked.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  {c.role && <span className="text-muted">{c.role}</span>}
                  {c.email && <a href={`mailto:${c.email}`} className="text-accent hover:underline">email</a>}
                  <form action={linkContact.bind(null, c.id, null)} className="ml-auto">
                    <button className="text-xs text-muted hover:text-danger">Unlink</button>
                  </form>
                </li>
              ))}
              {linked.length === 0 && <li className="text-muted">None linked.</li>}
            </ul>
            {unlinked.length > 0 && (
              <form
                action={async (form: FormData) => {
                  "use server";
                  const contactId = form.get("contact_id");
                  if (typeof contactId === "string" && contactId) await linkContact(contactId, id);
                }}
                className="mb-3 flex gap-2"
              >
                <select className="input" name="contact_id" aria-label="Existing contact" defaultValue="">
                  <option value="" disabled>Link existing contact…</option>
                  {unlinked.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>
                  ))}
                </select>
                <button className="btn">Link</button>
              </form>
            )}
            <details>
              <summary className="cursor-pointer text-sm text-muted">New contact</summary>
              <div className="mt-2">
                <ContactForm applicationId={id} defaultCompany={app.company} />
              </div>
            </details>
          </section>

          <form action={deleteApplication.bind(null, id)}>
            <button className="text-sm text-danger hover:underline">Delete application</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue: string | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input className="input" id={name} name={name} type={type} defaultValue={defaultValue ?? ""} required={required} />
    </div>
  );
}
