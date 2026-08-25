import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { LoginForm } from "@/components/admin/login-form";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { BrandIcon } from "@/components/ui/brand-icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
    <main className="flex min-h-screen flex-col text-ink">
      <div className="page flex flex-1 flex-col">
        <header className="flex items-start justify-between gap-4 py-7 lg:py-10">
          <p className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-ink">
            <Link
              aria-label="SoundShelf home"
              className="flex items-center gap-2.5 text-ink no-underline"
              href={"/" as Route}
            >
              <BrandIcon className="size-[18px] shrink-0 text-mood" />
              SoundShelf
            </Link>
            <span className="label !text-ink-3">Studio</span>
          </p>
          <ThemeToggle className="-mr-2.5 shrink-0" />
        </header>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[24rem]">
            <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-2 text-sm text-ink-2">
              Curator access to the tune library and playlists.
            </p>

            {isSignedInWithoutAdminAccess ? (
              <div className="rule-t mt-8 pt-6">
                <p className="text-sm font-medium text-danger">
                  This account is not an admin.
                </p>
                <p className="mt-2 text-sm text-ink-2">
                  Sign out, then use an administrator account to manage tunes
                  and playlists.
                </p>
                <div className="mt-4">
                  <SignOutButton />
                </div>
              </div>
            ) : (
              <div className="mt-8">
                <LoginForm />
              </div>
            )}
          </div>
        </div>

        <footer className="rule-t flex flex-wrap items-center justify-between gap-2 py-6 text-xs text-ink-3">
          <span>© {new Date().getFullYear()} SoundShelf</span>
          <span className="figure">
            Played in the order the curator set it
          </span>
        </footer>
      </div>
    </main>
  );
}
