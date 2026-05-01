import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { BrandIcon } from "@/components/ui/brand-icon";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-admin-pathname");
  const isLoginPage =
    pathname === "/admin/login" || pathname?.startsWith("/admin/login/");
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!isLoginPage && !session) {
    redirect("/admin/login" as Route);
  }

  if (isLoginPage) {
    return children;
  }

  return (
    <main className="relative min-h-screen text-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 lg:px-6 lg:py-8">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="panel overflow-hidden">
            <BrandBlock />
            <AdminNav />
            <div className="border-t border-[hsl(var(--border)/0.6)] px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--muted))]">
                Signed in
              </p>
              <p
                className="mt-1 truncate text-sm font-medium"
                title={session?.user?.email ?? ""}
              >
                {session?.user?.email ?? "Admin"}
              </p>
            </div>
          </div>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}

function BrandBlock() {
  return (
    <div className="flex items-center gap-3 border-b border-[hsl(var(--border)/0.6)] px-5 py-5">
      <span
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-2)/0.7)] text-[hsl(var(--accent))] shadow-[0_8px_30px_-12px_hsl(var(--accent)/0.5)]"
      >
        <BrandIcon />
      </span>
      <div className="min-w-0">
        <p className="kicker">SoundShelf</p>
        <p className="display-heading text-lg font-semibold leading-tight">
          Studio
        </p>
      </div>
    </div>
  );
}
