import "server-only";
import { createClient } from "@supabase/supabase-js";

// Bypasses row level security. Only for requests with no user session, like the
// inbound email webhook; callers must scope every query to a user themselves.
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
