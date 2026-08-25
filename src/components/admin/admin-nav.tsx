"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

type NavItem = {
  href: Route<string>;
  label: string;
};

/**
 * "Tunes", not "Songs" — the domain language in CONTEXT.md is the language the
 * Studio speaks.
 */
const navItems: NavItem[] = [
  { href: "/admin/tunes" as Route, label: "Tunes" },
  { href: "/admin/playlists" as Route, label: "Playlists" },
];

export function AdminNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Admin navigation">
      <ul className="flex gap-1 lg:grid lg:gap-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-[2px] py-1.5 pr-2.5 text-sm transition-colors duration-150 hover:text-ink lg:w-full ${
                  isActive ? "font-medium text-ink" : "text-ink-2"
                }`}
                href={item.href}
              >
                {/* The active mark is the same shelf tab used on the shelf. */}
                <span
                  aria-hidden="true"
                  className={isActive ? "shelf-tab" : "w-[3px]"}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
