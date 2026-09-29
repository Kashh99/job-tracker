// Pure helpers for turning inbound email payloads into plain text the
// extractor can read. No I/O here so it can be unit tested.

export type InboundMessage = {
  messageId: string | null;
  from: string | null;
  subject: string | null;
  text: string;
  // Per-user inbox token, from the "+tag" part of the address or the URL.
  token: string | null;
};

// Keep prompts small: confirmation emails are short, the rest is footer noise.
export const MAX_EMAIL_CHARS = 12_000;

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, label: string) => {
      const text = label.replace(/<[^>]+>/g, "").trim();
      return href.startsWith("http") && text !== href ? `${text} (${href})` : text;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&[#a-z0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncate(text: string, max = MAX_EMAIL_CHARS): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n[truncated]`;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

// Returns the "+tag" from an address like "inbox+TOKEN@example.com".
export function plusTag(address: string | null): string | null {
  const match = address?.match(/\+([^@\s>]+)@/);
  return match ? match[1] : null;
}

// Accepts Postmark's inbound JSON (PascalCase) or a generic
// { from, to, subject, text, html, messageId } shape from other providers.
export function parseInbound(body: unknown, urlToken: string | null): InboundMessage {
  const b = (body ?? {}) as Record<string, unknown>;
  const html = str(b.HtmlBody) ?? str(b.html);
  const text = str(b.TextBody) ?? str(b.StrippedTextReply) ?? str(b.text) ?? (html ? htmlToText(html) : "");
  const to = str(b.OriginalRecipient) ?? str(b.To) ?? str(b.to);

  return {
    messageId: str(b.MessageID) ?? str(b.messageId) ?? str(b.message_id),
    from: str(b.From) ?? str(b.from),
    subject: str(b.Subject) ?? str(b.subject),
    text: truncate(text),
    token: urlToken ?? str(b.MailboxHash) ?? plusTag(to),
  };
}
