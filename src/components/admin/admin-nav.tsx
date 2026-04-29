import Link from "next/link";
import type { Route } from "next";

const navItems: Array<{ href: Route<string>; label: string }> = [
  { href: "/admin" as Route<string>, label: "Dashboard" },
  { href: "/admin/tunes" as Route, label: "Tunes" },
  { href: "/admin/playlists" as Route, label: "Playlists" },
];

export function AdminNav() {
  return (
    <nav aria-label="Admin navigation" className="flex flex-wrap gap-2">
      {navItems.map((item) => (
        <Link
          className="rounded-md px-3 py-2 text-sm font-medium text-muted transition hover:bg-foreground/5 hover:text-foreground"
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
