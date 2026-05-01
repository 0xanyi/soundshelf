import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
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
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground/10 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <LinkHeading />
          <AdminNav />
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div>
    </main>
  );
}

function LinkHeading() {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        SoundShelf
      </p>
      <h1 className="text-xl font-semibold">Admin</h1>
    </div>
  );
}
