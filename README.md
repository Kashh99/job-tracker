# Job Tracker

**Problem:** job hunting across spreadsheets and inboxes means applications go quiet and nobody follows up. This app makes logging an application a 30-second job, reminds you when one goes stale, and shows which sources actually get replies.

**Live:** https://job-tracker-teal-five.vercel.app

![Job Tracker sign-in - the board itself is login-protected](screenshot.png)

## Features

- **Kanban board** — Saved → Applied → Interviewing → Offer → Rejected → Ghosted, with drag-and-drop status changes.
- **Quick add** — only company and role are required; URL, source and status are optional.
- **Import from email** — paste a "thanks for applying" email, or forward it to your personal inbox address, and an LLM pulls out company, role, location, work mode, pay, job ID, link and any named recruiter. The application goes straight onto the board marked "review"; a matching Saved card is moved to Applied instead of duplicated. Every received email is logged in Settings.
- **Application records** — job URL, source, resume version, notes, and a timeline of status changes, follow-ups, interviews and notes.
- **Follow-up reminders** — anything in Applied with no activity for N days (default 12, configurable in Settings) is flagged at the top of the board. One click logs the follow-up and resets the clock.
- **Contacts** — lightweight, optionally linked to an application.
- **Analytics** — response rate overall, by source and by company; median days to reply; funnel (applied → interview → offer); applications per week.
- **Auth** — Supabase email/password. Single user in practice, but every table is multi-tenant with row level security.

## Stack

Next.js 16 (App Router, Server Actions) · Supabase (Postgres + Auth) · Tailwind CSS 4 · Recharts · dnd-kit · AI SDK + Vercel AI Gateway · Vercel.

## How it works

Status changes are written to the `events` table by a Postgres trigger, not by the client. That makes the timeline complete by construction, and analytics become plain queries over it: "days to reply" is the gap between `applied_date` and the first `interviewing`/`offer`/`rejected` event. The analytics math lives in `src/lib/analytics.ts` and is unit tested.

## Tradeoffs

- I used Supabase instead of a custom API + ORM because auth, Postgres and row level security come in one box, and this is a ship-it-fast project.
- Analytics are computed in TypeScript over the user's rows instead of SQL views. At personal scale (hundreds of rows) this is instant and much easier to test; it would move into SQL if it ever needed to scale.
- Follow-up reminders show on the board instead of via email. Email would need a scheduled job and a mail provider; that is a v2 idea along with resume parsing and a browser extension.
- Email import uses forwarding instead of reading Gmail directly. The Gmail API would need Google OAuth with a restricted scope and a security review; a forwarding filter gets the same result with no stored Google credentials, and the user decides exactly which emails the app sees.

## Run it locally

1. Create a Supabase project.
2. In the Supabase SQL editor, run `supabase/migrations/0001_init.sql`, then `0002_email_import.sql`.
3. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key (Project Settings → API Keys).
4. In Supabase Auth → URL Configuration, add `http://localhost:3000/auth/confirm` and `https://<your-domain>/auth/confirm` to the redirect URLs. For single-user use you can instead turn off "Confirm email".
5. Install and run:

```bash
npm install
npm run dev
npm test
```

## Deploy

Import the repo into Vercel and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as environment variables.

### Email import

Extraction runs through Vercel AI Gateway (`google/gemini-2.5-flash-lite`, which the Gateway free tier allows). On Vercel it authenticates with OIDC; locally, run `vercel env pull` or set `AI_GATEWAY_API_KEY`. The Gateway needs a card on file for the Vercel team. Without it, imports fall back to pattern matching (`src/lib/extract-basic.ts`), which reads the common ATS templates but finds fewer fields.

Pasting emails works with just that. For automatic forwarding:

1. Set `SUPABASE_SECRET_KEY` (server-only; the webhook has no user session).
2. Create a Postmark inbound server and point its webhook at `https://<your-domain>/api/inbound`. Set `INBOUND_EMAIL_ADDRESS` to its inbound address. Your personal address (shown in Settings) is that address with `+<inbox token>` added, which Postmark passes along as `MailboxHash`. Other providers work too: post `{ from, to, subject, text, html }` JSON to the webhook URL shown in Settings.
3. In Gmail, add the forwarding address under Settings → Forwarding. Gmail's confirmation email is logged under Recent imports in the app, so you can read the code there.
4. Add a Gmail filter (e.g. subject contains "application" or "applying") that forwards matches.

The inbox token is the only credential for the webhook; rotate it from Settings if it leaks. Unknown tokens are rejected before the model is called.
