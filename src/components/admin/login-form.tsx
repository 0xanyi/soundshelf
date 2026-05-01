"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useState, type FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    let didNavigate = false;

    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/admin",
      });

      if (error) {
        setErrorMessage(error.message ?? "Unable to sign in.");
        return;
      }

      didNavigate = true;
      router.push("/admin" as Route);
      router.refresh();
    } catch {
      setErrorMessage("Unable to sign in. Please try again.");
    } finally {
      if (!didNavigate) {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="block text-xs font-medium uppercase tracking-[0.2em] text-[hsl(var(--muted))]" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className="field"
          id="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@studio.com"
          required
          type="email"
          value={email}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium uppercase tracking-[0.2em] text-[hsl(var(--muted))]" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className="field"
          id="password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          required
          type="password"
          value={password}
        />
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-[hsl(var(--danger)/0.5)] bg-[hsl(var(--danger)/0.12)] px-3 py-2 text-sm text-[hsl(var(--danger))]">
          {errorMessage}
        </p>
      ) : null}

      <button
        className="btn-primary w-full"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} aria-hidden="true" className="animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            Sign in
            <ArrowRight size={16} aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}
