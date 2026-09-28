import Link from "next/link";
import { signOut } from "@/app/actions";

const NAV = [
  { href: "/", label: "Board" },
  { href: "/contacts", label: "Contacts" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-border bg-surface">
        <nav className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 text-sm">
          <span className="mr-3 font-semibold">Job Tracker</span>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-2.5 py-1.5 text-muted hover:bg-background hover:text-foreground">
              {item.label}
            </Link>
          ))}
          <form action={signOut} className="ml-auto">
            <button className="rounded-md px-2.5 py-1.5 text-muted hover:text-foreground">Sign out</button>
          </form>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
