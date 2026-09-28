"use client";

import { useActionState, useState } from "react";
import { authenticate, type LoginState } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, action, pending] = useActionState<LoginState, FormData>(authenticate, {});

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <form action={action} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <h1 className="text-lg font-semibold">Job Tracker</h1>
          <p className="text-sm text-muted">
            {mode === "signin" ? "Sign in to your board." : "Create an account."}
          </p>
        </div>
        <input type="hidden" name="mode" value={mode} />
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </div>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.message && <p className="text-sm text-muted">{state.message}</p>}
        <button className="btn btn-primary w-full" disabled={pending}>
          {mode === "signin" ? "Sign in" : "Sign up"}
        </button>
        <button
          type="button"
          className="w-full text-sm text-muted hover:text-foreground"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
