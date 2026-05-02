"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { ListMusic, Music2 } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type NavItem = {
  href: Route<string>;
  label: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
};

const navItems: NavItem[] = [
  {
    href: "/admin/tunes" as Route,
    label: "Songs",
    description: "Library",
    icon: Music2,
  },
  {
    href: "/admin/playlists" as Route,
    label: "Playlists",
    description: "Curated sets",
    icon: ListMusic,
  },
];

export function AdminNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Admin navigation" className="grid gap-1 p-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className="group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-medium text-[hsl(var(--muted))] transition hover:bg-[hsl(var(--surface-2)/0.7)] hover:text-foreground focus:outline-none focus:ring-4 focus:ring-[hsl(var(--mood)/0.2)] data-[active=true]:border-[hsl(var(--mood)/0.4)] data-[active=true]:bg-[hsl(var(--mood)/0.12)] data-[active=true]:text-foreground"
            data-active={isActive}
            href={item.href}
            key={item.href}
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-2)/0.6)] text-[hsl(var(--muted))] transition group-hover:text-foreground group-data-[active=true]:border-transparent group-data-[active=true]:bg-[linear-gradient(135deg,hsl(var(--mood)),hsl(var(--mood-2)))] group-data-[active=true]:text-[hsl(28_40%_8%)]"
            >
              <Icon size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block leading-tight">{item.label}</span>
              <span className="block text-[11px] font-normal text-[hsl(var(--muted))]">
                {item.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
