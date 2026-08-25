import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { BrandIcon } from "@/components/ui/brand-icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { auth } from "@/lib/auth";
import { requireAdminSession } from "@/lib/http/errors";

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

  const adminSession = isLoginPage ? null : await requireAdminSession();

  if (!isLoginPage && !adminSession) {
    redirect("/admin/login" as Route);
  }

  if (isLoginPage) {
    return children;
  }

  return (
    <div className="page min-h-screen text-ink lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      {/* The shell is divided by a rule, not built from a panel. */}
      <aside className="rule-b flex flex-col gap-6 py-5 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-rule lg:py-7 lg:pr-6">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-ink">
            <BrandIcon className="size-4 shrink-0 text-mood" />
            SoundShelf
            <span className="label !text-ink-3">Studio</span>
          </p>
          <ThemeToggle className="-mr-2.5 lg:hidden" />
        </div>

        <AdminNav />

        <div className="rule-t hidden pt-4 lg:mt-auto lg:block">
          <p className="label">Signed in</p>
          <p
            className="mt-1 truncate text-sm text-ink"
            title={adminSession?.email ?? ""}
          >
            {adminSession?.email ?? "Admin"}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <SignOutButton />
            <ThemeToggle className="-mr-2.5" />
          </div>
        </div>
      </aside>

      <main className="min-w-0 py-8 lg:py-12 lg:pl-10">
        {children}

        <div className="rule-t mt-12 flex items-center justify-between gap-3 pt-5 lg:hidden">
          <p className="truncate text-xs text-ink-3">
            {adminSession?.email ?? "Admin"}
          </p>
          <SignOutButton />
        </div>
      </main>
    </div>
  );
}
