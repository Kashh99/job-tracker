import { describe, expect, it } from "vitest";
import { computeAnalytics, median } from "./analytics";
import { needsFollowUp } from "./follow-up";
import { weekStart } from "./dates";

const app = (id: string, over: Partial<Parameters<typeof computeAnalytics>[0][number]> = {}) => ({
  id,
  company: "Acme",
  source: "linkedin" as const,
  status: "applied" as const,
  applied_date: "2026-09-01",
  ...over,
});

const statusEvent = (application_id: string, detail: string, event_date: string) => ({
  application_id,
  type: "status_change" as const,
  detail,
  event_date,
});

describe("median", () => {
  it("handles empty, odd and even inputs", () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("weekStart", () => {
  it("returns the Monday of the week", () => {
    expect(weekStart("2026-09-27")).toBe("2026-09-21"); // Sunday
    expect(weekStart("2026-09-21")).toBe("2026-09-21"); // Monday
  });
});

describe("needsFollowUp", () => {
  it("flags only stale applied applications", () => {
    const base = { status: "applied" as const, last_activity_date: "2026-09-01" };
    expect(needsFollowUp(base, 12, "2026-09-13")).toBe(true);
    expect(needsFollowUp(base, 12, "2026-09-12")).toBe(false);
    expect(needsFollowUp({ ...base, status: "interviewing" }, 12, "2026-10-01")).toBe(false);
  });
});

describe("computeAnalytics", () => {
  const apps = [
    app("a", { status: "offer" }),
    app("b", { status: "rejected", source: "referral", company: "Globex" }),
    app("c", { status: "ghosted" }),
    app("d", { status: "saved", applied_date: null }),
  ];
  const events = [
    statusEvent("a", "applied", "2026-09-01"),
    statusEvent("a", "interviewing", "2026-09-05"),
    statusEvent("a", "offer", "2026-09-20"),
    statusEvent("b", "applied", "2026-09-01"),
    statusEvent("b", "rejected", "2026-09-11"),
    statusEvent("c", "applied", "2026-09-01"),
    statusEvent("c", "ghosted", "2026-09-25"),
    statusEvent("d", "saved", "2026-09-02"),
  ];
  const result = computeAnalytics(apps, events, "2026-09-27", 4);

  it("builds the funnel and skips saved-only applications", () => {
    expect(result.funnel).toEqual([
      { stage: "Applied", count: 3 },
      { stage: "Interview", count: 1 },
      { stage: "Offer", count: 1 },
    ]);
  });

  it("counts interviews and rejections as responses, not ghosting", () => {
    expect(result.responseRate).toBeCloseTo(2 / 3);
    expect(result.medianDaysToReply).toBe(7); // replies after 4 and 10 days
  });

  it("groups response rate by source and company", () => {
    expect(result.bySource).toEqual([
      { name: "linkedin", applied: 2, responded: 1, rate: 0.5 },
      { name: "referral", applied: 1, responded: 1, rate: 1 },
    ]);
    expect(result.byCompany.map((r) => r.name)).toEqual(["Acme", "Globex"]);
  });

  it("buckets applications per week", () => {
    expect(result.perWeek).toEqual([
      { week: "2026-08-31", count: 3 },
      { week: "2026-09-07", count: 0 },
      { week: "2026-09-14", count: 0 },
      { week: "2026-09-21", count: 0 },
    ]);
  });
});
