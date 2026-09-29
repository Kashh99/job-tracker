import { companyHue } from "@/lib/ui";

export function CompanyAvatar({ company, size = "sm" }: { company: string; size?: "sm" | "lg" }) {
  const hue = companyHue(company);
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-semibold ${
        size === "lg" ? "size-10 text-base" : "size-7 text-xs"
      }`}
      style={{ background: `hsl(${hue} 70% 50% / 0.15)`, color: `hsl(${hue} 60% 45%)` }}
    >
      {company.trim().charAt(0).toUpperCase()}
    </span>
  );
}
