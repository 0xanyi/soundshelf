"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);

    try {
      await authClient.signOut();
    } finally {
      router.replace("/admin/login" as Route);
      router.refresh();
    }
  }

  return (
    <button
      className="btn-secondary mt-3 w-full"
      disabled={isPending}
      onClick={() => void handleSignOut()}
      type="button"
    >
      <LogOut aria-hidden="true" size={16} />
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
