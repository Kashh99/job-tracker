"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; message?: string };

export async function authenticate(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const mode = form.get("mode");
  if (!email || password.length < 6) return { error: "Enter an email and a password of 6+ characters." };

  const supabase = await createClient();

  if (mode === "signup") {
    const origin = (await headers()).get("origin");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/confirm` },
    });
    if (error) return { error: error.message };
    if (!data.session) return { message: "Check your email to confirm your account." };
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
  }

  redirect("/");
}
