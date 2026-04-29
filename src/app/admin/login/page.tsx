import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { LoginForm } from "@/components/admin/login-form";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/admin" as Route);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <section className="w-full max-w-sm">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-accent">
          Admin
        </p>
        <h1 className="text-3xl font-semibold">Sign in</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Use your administrator account to manage prayer tunes and playlists.
        </p>
        <div className="mt-8 rounded-lg border border-foreground/10 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
