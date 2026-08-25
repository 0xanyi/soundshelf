"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

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
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <div>
        <label className="label block" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className="field"
          id="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>

      <div>
        <label className="label block" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className="field"
          id="password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>

      {errorMessage ? (
        <p className="text-sm text-danger" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button
        className="control control-solid mt-1 h-10 w-full"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={15} aria-hidden="true" className="animate-spin" />
            <span>Signing in…</span>
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
