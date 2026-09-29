"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { importPastedEmail, type PasteImportState } from "@/app/actions";

const TONE = {
  imported: "border-ok/40 bg-ok-bg text-ok",
  duplicate: "border-border bg-background text-muted",
  skipped: "border-warn/40 bg-warn-bg text-warn",
  failed: "border-danger/40 bg-danger/10 text-danger",
} as const;

// Paste a "thanks for applying" email; the server extracts the details and
// adds the application straight to the board, flagged for review.
export function PasteEmail() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<PasteImportState, FormData>(importPastedEmail, {});

  useEffect(() => {
    if (state.result?.status === "imported") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <label className="label" htmlFor="paste-email">
        Paste the confirmation email. Company, role, location, pay and job ID are pulled out automatically.
      </label>
      <textarea
        id="paste-email"
        name="email"
        required
        className="input min-h-32 font-mono text-xs"
        placeholder={"Thank you for applying to Acme!\n\nWe received your application for Senior Frontend Engineer (Remote)…"}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Reading email…" : "Import"}
        </button>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.result && (
          <p className={`rounded-md border px-2.5 py-1 text-sm ${TONE[state.result.status]}`}>
            {state.result.detail}
            {state.result.applicationId && (
              <>
                {" · "}
                <Link href={`/applications/${state.result.applicationId}`} className="font-medium underline">
                  Open
                </Link>
              </>
            )}
          </p>
        )}
      </div>
    </form>
  );
}
