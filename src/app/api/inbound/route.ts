import { createAdminClient } from "@/lib/supabase/admin";
import { parseInbound } from "@/lib/email";
import { importEmail } from "@/lib/import-email";

export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Inbound email webhook (Postmark JSON, or any provider posting
// { from, to, subject, text, html }). The user is identified by their inbox
// token, passed as ?token= or as the "+tag" of the forwarding address.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const message = parseInbound(body, new URL(request.url).searchParams.get("token"));
  // Check the token before calling the model so strangers cannot spend credits.
  if (!message.token || !UUID.test(message.token)) {
    return Response.json({ error: "Unknown inbox" }, { status: 404 });
  }

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("inbox_token", message.token)
    .maybeSingle();
  if (!user) return Response.json({ error: "Unknown inbox" }, { status: 404 });

  const result = await importEmail(supabase, user.id, message);
  // Always 200 once the email is logged, so the provider does not retry skips.
  return Response.json(result);
}
