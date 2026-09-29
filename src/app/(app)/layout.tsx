import Link from "next/link";
import { signOut } from "@/app/actions";
import { NavLinks } from "./nav-links";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-surface/85 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2.5 text-sm">
          <Link href="/" className="mr-4 flex items-center gap-2 font-semibold">
            <span aria-hidden className="inline-flex size-6 items-center justify-center rounded-md bg-accent text-xs text-accent-fg">
              JT
            </span>
            Job Tracker
          </Link>
          <NavLinks />
          <form action={signOut} className="ml-auto">
            <button className="rounded-md px-2.5 py-1.5 text-muted transition-colors hover:text-foreground">Sign out</button>
          </form>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
