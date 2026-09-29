"use client";

import { useRef, useTransition } from "react";
import { createApplication } from "@/app/actions";
import { SOURCES, SOURCE_LABELS } from "@/lib/types";

// Company + role is all that is required, so logging an application stays under 30 seconds.
export function QuickAdd() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(form) =>
        startTransition(async () => {
          await createApplication(form);
          formRef.current?.reset();
          formRef.current?.querySelector<HTMLInputElement>("[name=company]")?.focus();
        })
      }
      className="flex flex-wrap items-end gap-2"
    >
      <div className="min-w-36 flex-1">
        <label className="label" htmlFor="qa-company">Company</label>
        <input className="input" id="qa-company" name="company" required autoFocus />
      </div>
      <div className="min-w-36 flex-1">
        <label className="label" htmlFor="qa-role">Role</label>
        <input className="input" id="qa-role" name="role" required />
      </div>
      <div className="min-w-36 flex-1">
        <label className="label" htmlFor="qa-url">Job URL</label>
        <input className="input" id="qa-url" name="job_url" type="url" placeholder="optional" />
      </div>
      <div className="w-32">
        <label className="label" htmlFor="qa-source">Source</label>
        <select className="input" id="qa-source" name="source" defaultValue="">
          <option value="">—</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
          ))}
        </select>
      </div>
      <div className="w-28">
        <label className="label" htmlFor="qa-status">Status</label>
        <select className="input" id="qa-status" name="status" defaultValue="applied">
          <option value="applied">Applied</option>
          <option value="saved">Saved</option>
        </select>
      </div>
      <button className="btn btn-primary" disabled={pending}>{pending ? "Adding…" : "Add"}</button>
    </form>
  );
}
