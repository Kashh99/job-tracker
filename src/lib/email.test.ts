import { describe, expect, it } from "vitest";
import { htmlToText, parseInbound, plusTag, truncate } from "./email";
import { companyKey, normalizeExtraction, roleKey, type RawExtraction } from "./extract";

describe("htmlToText", () => {
  it("strips tags, styles and entities and keeps links", () => {
    const html = `<style>p{color:red}</style><p>Thanks for applying&nbsp;to <b>Acme</b>!</p>
      <p>View <a href="https://jobs.acme.com/123">your application</a></p>`;
    expect(htmlToText(html)).toBe(
      "Thanks for applying to Acme!\n\nView your application (https://jobs.acme.com/123)",
    );
  });
});

describe("parseInbound", () => {
  it("reads Postmark payloads and takes the token from MailboxHash", () => {
    const msg = parseInbound(
      { MessageID: "m1", From: "no-reply@acme.com", Subject: "Thanks", TextBody: "Hello", MailboxHash: "tok" },
      null,
    );
    expect(msg).toEqual({ messageId: "m1", from: "no-reply@acme.com", subject: "Thanks", text: "Hello", token: "tok" });
  });

  it("falls back to HTML and the plus-tag of the recipient", () => {
    const msg = parseInbound({ to: "Jobs <in+abc-123@example.com>", html: "<p>Hi</p>" }, null);
    expect(msg.text).toBe("Hi");
    expect(msg.token).toBe("abc-123");
  });

  it("prefers the URL token", () => {
    expect(parseInbound({ MailboxHash: "tag" }, "url").token).toBe("url");
  });
});

describe("plusTag / truncate", () => {
  it("returns null without a tag", () => expect(plusTag("in@example.com")).toBeNull());
  it("truncates long text", () => expect(truncate("abcdef", 3)).toBe("abc\n[truncated]"));
});

const raw = (over: Partial<RawExtraction> = {}): RawExtraction => ({
  isApplicationConfirmation: true,
  company: "Acme",
  role: "Engineer",
  location: null,
  workMode: null,
  salary: null,
  jobRef: null,
  jobUrl: null,
  appliedDate: null,
  source: null,
  contactName: null,
  contactEmail: null,
  contactRole: null,
  ...over,
});

describe("normalizeExtraction", () => {
  it("trims values and drops malformed URLs and dates", () => {
    const x = normalizeExtraction(
      raw({ company: "  Acme \n Corp ", jobUrl: "javascript:alert(1)", appliedDate: "Sept 3" }),
    );
    expect(x.company).toBe("Acme Corp");
    expect(x.jobUrl).toBeNull();
    expect(x.appliedDate).toBeNull();
  });

  it("keeps valid URLs and dates", () => {
    const x = normalizeExtraction(raw({ jobUrl: "https://acme.com/jobs/1", appliedDate: "2026-09-03" }));
    expect(x.jobUrl).toBe("https://acme.com/jobs/1");
    expect(x.appliedDate).toBe("2026-09-03");
  });

  it("drops no-reply contact emails but keeps the named person", () => {
    const x = normalizeExtraction(raw({ contactName: "Jo Smith", contactEmail: "no-reply@acme.com" }));
    expect(x.contact).toEqual({ name: "Jo Smith", email: null, role: null });
  });

  it("has no contact without a name", () => {
    expect(normalizeExtraction(raw({ contactEmail: "jo@acme.com" })).contact).toBeNull();
  });
});

describe("dedupe keys", () => {
  it("ignores case, punctuation and legal suffixes", () => {
    expect(companyKey("Acme, Inc.")).toBe(companyKey("acme"));
    expect(roleKey("Software Engineer - II")).toBe(roleKey("software engineer ii"));
  });
});
