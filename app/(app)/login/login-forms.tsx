"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = { nextPath: string };

export function LoginForms({ nextPath }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<null | "email" | "google">(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function buildCallbackUrl() {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  }

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setLocalError("Enter your email.");
      return;
    }
    setBusy("email");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: buildCallbackUrl() },
      });
      if (error) {
        setLocalError(error.message);
        return;
      }
      router.push(
        `/login?check_email=1&next=${encodeURIComponent(nextPath)}`,
      );
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function continueWithGoogle() {
    setLocalError(null);
    setBusy("google");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: buildCallbackUrl() },
      });
      if (error || !data.url) {
        setLocalError(error?.message ?? "Could not start Google sign-in.");
        return;
      }
      window.location.assign(data.url);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {localError ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {localError}
        </p>
      ) : null}

      <form onSubmit={sendMagicLink} className="mt-8 flex flex-col gap-3">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 shadow-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            placeholder="you@example.com"
          />
        </label>
        <button
          type="submit"
          disabled={busy !== null}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {busy === "email" ? "Sending…" : "Send magic link"}
        </button>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide text-zinc-500">
          or
        </div>
      </div>

      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={busy !== null}
        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
      >
        {busy === "google" ? "Redirecting…" : "Continue with Google"}
      </button>
    </>
  );
}
