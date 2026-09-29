import { describe, expect, it } from "vitest";
import { basicExtract, companyFromSender } from "./extract-basic";

const email = (from: string | null, subject: string | null, text: string) => ({ from, subject, text });

describe("basicExtract", () => {
  it("reads a Workday-style confirmation", () => {
    const x = basicExtract(
      email(
        "Acme Robotics Careers <no-reply@myworkday.com>",
        "Thank you for applying to Acme Robotics",
        `Hi Kashyap,
Thank you for your interest in Acme Robotics! We have received your application for Senior Frontend Engineer (Req ID R-10442).
Location: Toronto, ON (Hybrid)
The base pay range for this role is CAD $130,000 - $155,000.
Track your application: https://acme.wd5.myworkdayjobs.com/en-US/careers/userHome`,
      ),
    );
    expect(x).toMatchObject({
      isApplicationConfirmation: true,
      company: "Acme Robotics",
      role: "Senior Frontend Engineer",
      location: "Toronto, ON (Hybrid)",
      workMode: "hybrid",
      salary: "CAD $130,000 - $155,000",
      jobRef: "R-10442",
      jobUrl: "https://acme.wd5.myworkdayjobs.com/en-US/careers/userHome",
    });
  });

  it("reads a Greenhouse-style 'role at company' sentence", () => {
    const x = basicExtract(
      email(
        "Globex Hiring Team <no-reply@us.greenhouse-mail.io>",
        "Thank you for applying!",
        "Hi there,\n\nThanks for applying to the Backend Engineer, Payments role at Globex. Our team will review your application.",
      ),
    );
    expect(x.company).toBe("Globex");
    expect(x.role).toBe("Backend Engineer, Payments");
  });

  it("reads a Lever-style email and falls back to the sender for the company", () => {
    const x = basicExtract(
      email(
        "Initech <no-reply@hire.lever.co>",
        "Your application",
        "Hi,\n\nThank you for your application for the Data Analyst position. We will be in touch.",
      ),
    );
    expect(x.isApplicationConfirmation).toBe(true);
    expect(x.company).toBe("Initech");
    expect(x.role).toBe("Data Analyst");
  });

  it("reads LinkedIn Easy Apply confirmations", () => {
    const x = basicExtract(
      email(
        "LinkedIn <jobs-noreply@linkedin.com>",
        "Kashyap, your application was sent to Umbrella Corp",
        "Your application was sent to Umbrella Corp\nPosition: Machine Learning Engineer\nRemote - United States",
      ),
    );
    expect(x).toMatchObject({ company: "Umbrella Corp", role: "Machine Learning Engineer", source: "linkedin" });
  });

  it("does not treat rejections as confirmations", () => {
    const x = basicExtract(
      email(null, "Your application", "Thank you for applying to Acme. Unfortunately we will not be moving forward."),
    );
    expect(x.isApplicationConfirmation).toBe(false);
  });

  it("ignores newsletters", () => {
    expect(basicExtract(email(null, "Weekly digest", "Top stories this week")).isApplicationConfirmation).toBe(false);
  });

  it("does not take words as job IDs", () => {
    expect(basicExtract(email(null, null, "Thank you for applying. Reference your email for updates.")).jobRef).toBeNull();
  });
});

describe("companyFromSender", () => {
  it("strips team suffixes and ignores vendors", () => {
    expect(companyFromSender("Acme Talent Acquisition <x@acme.com>")).toBe("Acme");
    expect(companyFromSender("Workday <no-reply@myworkday.com>")).toBeNull();
    expect(companyFromSender("no-reply@acme.com")).toBeNull();
  });
});
