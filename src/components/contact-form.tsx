"use client";

import { useRef } from "react";
import { createContact } from "@/app/actions";
import type { Application } from "@/lib/types";

export function ContactForm({
  applicationId,
  defaultCompany,
  applications,
}: {
  applicationId?: string;
  defaultCompany?: string;
  applications?: Pick<Application, "id" | "company" | "role">[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (form) => {
        await createContact(form);
        formRef.current?.reset();
      }}
      className="grid gap-2 sm:grid-cols-2"
    >
      {applicationId && <input type="hidden" name="application_id" value={applicationId} />}
      <input className="input" name="name" placeholder="Name" required aria-label="Name" />
      <input className="input" name="role" placeholder="Role (e.g. Recruiter)" aria-label="Role" />
      <input className="input" name="company" placeholder="Company" defaultValue={defaultCompany} aria-label="Company" />
      <input className="input" name="email" type="email" placeholder="Email" aria-label="Email" />
      {applications && (
        <select className="input sm:col-span-2" name="application_id" defaultValue="" aria-label="Linked application">
          <option value="">Not linked to an application</option>
          {applications.map((a) => (
            <option key={a.id} value={a.id}>{a.company} — {a.role}</option>
          ))}
        </select>
      )}
      <input className="input sm:col-span-2" name="notes" placeholder="Notes" aria-label="Notes" />
      <button className="btn btn-primary sm:col-span-2">Add contact</button>
    </form>
  );
}
