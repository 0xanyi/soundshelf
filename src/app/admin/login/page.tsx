import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { LoginForm } from "@/components/admin/login-form";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { BrandIcon } from "@/components/ui/brand-icon";
import { auth } from "@/lib/auth";
import { requireAdminSession } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const adminSession = session ? await requireAdminSession() : null;

  if (adminSession) {
    redirect("/admin" as Route);
  }

  const isSignedInWithoutAdminAccess = Boolean(session);

  return (
    <main className="relative grid min-h-screen place-items-center px-4 py-12 text-foreground sm:px-6">
      <div className="relative w-full max-w-md">
        <div className="panel relative overflow-hidden p-8 sm:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 right-0 size-64 rounded-full bg-[hsl(var(--mood-2)/0.22)] blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-12 size-72 rounded-full bg-[hsl(var(--mood)/0.18)] blur-3xl"
          />

          <div className="relative">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-2xl border border-[hsl(var(--mood)/0.35)] bg-[hsl(var(--surface-2)/0.7)] text-[hsl(var(--mood))]"
              >
                <BrandIcon />
              </span>
              <div>
                <p className="kicker">SoundShelf</p>
                <p className="display-heading text-base font-semibold">
                  Studio Access
                </p>
              </div>
            </div>

            <h1 className="display-heading mt-8 text-3xl font-semibold sm:text-4xl">
              Sign in
            </h1>
            <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted))]">
              Use your administrator account to manage audio and playlists.
            </p>

            {isSignedInWithoutAdminAccess ? (
              <div className="mt-8 rounded-2xl border border-[hsl(var(--danger)/0.35)] bg-[hsl(var(--danger)/0.1)] p-4 text-sm text-[hsl(var(--danger))]">
                <p className="font-medium">This account is not an admin.</p>
                <p className="mt-2 leading-6">
                  Sign out, then use an administrator account to manage audio and
                  playlists.
                </p>
                <SignOutButton />
              </div>
            ) : (
              <div className="mt-8">
                <LoginForm />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
