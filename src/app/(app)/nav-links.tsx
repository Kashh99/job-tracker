"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Board" },
  { href: "/contacts", label: "Contacts" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export function NavLinks() {
  const pathname = usePathname();
  return NAV.map((item) => {
    const active = item.href === "/" ? pathname === "/" || pathname.startsWith("/applications") : pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`rounded-md px-2.5 py-1.5 transition-colors ${
          active ? "bg-foreground/5 font-medium text-foreground" : "text-muted hover:text-foreground"
        }`}
      >
        {item.label}
      </Link>
    );
  });
}
