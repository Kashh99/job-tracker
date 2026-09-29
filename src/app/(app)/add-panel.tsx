"use client";

import { useState } from "react";
import { QuickAdd } from "./quick-add";
import { PasteEmail } from "./paste-email";

const TABS = [
  { id: "quick", label: "Quick add" },
  { id: "email", label: "From email" },
] as const;

export function AddPanel() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("quick");

  return (
    <section className="card p-3">
      <div role="tablist" aria-label="Add application" className="mb-3 inline-flex gap-1 rounded-lg bg-background p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`add-${t.id}`}
            className="tab"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`add-${tab}`}>
        {tab === "quick" ? <QuickAdd /> : <PasteEmail />}
      </div>
    </section>
  );
}
