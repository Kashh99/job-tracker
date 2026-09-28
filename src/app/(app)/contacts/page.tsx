import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { deleteContact } from "@/app/actions";
import { ContactForm } from "@/components/contact-form";
import type { Application, Contact } from "@/lib/types";

export default async function ContactsPage() {
  const { supabase } = await requireUser();
  const [contactsRes, appsRes] = await Promise.all([
    supabase.from("contacts").select("*").order("name"),
    supabase.from("applications").select("id, company, role").order("company"),
  ]);
  const contacts = (contactsRes.data ?? []) as Contact[];
  const apps = (appsRes.data ?? []) as Pick<Application, "id" | "company" | "role">[];
  const appById = new Map(apps.map((a) => [a.id, a]));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Company</th>
              <th className="px-3 py-2 font-medium">Application</th>
              <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => {
              const app = c.application_id ? appById.get(c.application_id) : undefined;
              return (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium">{c.name}</div>
                    {c.email && <a href={`mailto:${c.email}`} className="text-xs text-accent hover:underline">{c.email}</a>}
                  </td>
                  <td className="px-3 py-2 text-muted">{c.role}</td>
                  <td className="px-3 py-2 text-muted">{c.company}</td>
                  <td className="px-3 py-2">
                    {app && <Link href={`/applications/${app.id}`} className="hover:underline">{app.company} — {app.role}</Link>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <form action={deleteContact.bind(null, c.id)}>
                      <button className="text-xs text-muted hover:text-danger">Delete</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {contacts.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted">No contacts yet.</td></tr>
            )}
          </tbody>
        </table>
      </section>
      <section className="card h-fit p-4">
        <h2 className="mb-3 text-sm font-semibold">Add contact</h2>
        <ContactForm applications={apps} />
      </section>
    </div>
  );
}
