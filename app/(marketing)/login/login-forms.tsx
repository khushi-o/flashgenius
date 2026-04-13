"use client";

import { devQuickLogin } from "@/lib/actions/dev-login";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Props = { nextPath: string; devQuickLoginEnabled?: boolean };

export function LoginForms({ nextPath, devQuickLoginEnabled }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [busy, setBusy] = useState<null | "email" | "google" | "dev">(null);
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
      const nameTrim = preferredName.trim().slice(0, 80);
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: buildCallbackUrl(),
          ...(nameTrim ? { data: { display_name: nameTrim } } : {}),
        },
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

  async function runDevQuickLogin() {
    setLocalError(null);
    setBusy("dev");
    try {
      const result = await devQuickLogin(nextPath);
      if (result?.ok === false) {
        setLocalError(result.message);
      }
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
        <p className="fg-login-err mt-4" role="alert">
          {localError}
        </p>
      ) : null}

      <form onSubmit={sendMagicLink} className="mt-6 flex flex-col gap-3">
        <label className="text-sm font-medium text-p-sand">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-p-sand/20 bg-p-navy-deep/80 px-3 py-2.5 text-sm text-p-cream shadow-inner outline-none ring-p-sage/30 placeholder:text-p-sand-dim focus:border-p-sage/50 focus:ring-2"
            placeholder="you@example.com"
          />
        </label>
        <label className="text-sm font-medium text-p-sand">
          What should we call you?{" "}
          <span className="font-normal text-p-sand-dim">(optional)</span>
          <input
            name="preferred_name"
            type="text"
            autoComplete="nickname"
            maxLength={80}
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-p-sand/20 bg-p-navy-deep/80 px-3 py-2.5 text-sm text-p-cream shadow-inner outline-none ring-p-sage/30 placeholder:text-p-sand-dim focus:border-p-sage/50 focus:ring-2"
            placeholder="Your name"
          />
        </label>
        <button
          type="submit"
          disabled={busy !== null}
          className="tap-scale min-h-11 w-full rounded-xl bg-gradient-to-r from-p-sage to-p-sage-muted px-4 py-3 text-sm font-semibold text-p-navy shadow-lg shadow-black/30 hover:brightness-105 disabled:opacity-50 [-webkit-tap-highlight-color:transparent]"
        >
          {busy === "email" ? "Sending…" : "Email me a magic link"}
        </button>
      </form>

      <div className="relative my-7">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-p-sand/20" />
        </div>
        <div className="relative flex justify-center text-[10px] font-semibold uppercase tracking-[0.2em] text-p-sand-dim">
          or continue with
        </div>
      </div>

      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={busy !== null}
        className="tap-scale flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-p-sand/25 bg-p-navy-mid/70 px-4 py-3 text-sm font-medium text-p-cream transition-colors duration-150 hover:border-p-sage/35 hover:bg-p-navy/80 disabled:opacity-50 [-webkit-tap-highlight-color:transparent]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {busy === "google" ? "Redirecting…" : "Google"}
      </button>

      {devQuickLoginEnabled ? (
        <div className="mt-8 rounded-xl border border-amber-800/50 bg-amber-950/25 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/90">
            Local dev only
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/65">
            Uses <code className="rounded bg-black/35 px-1">DEV_LOGIN_EMAIL</code> /{" "}
            <code className="rounded bg-black/35 px-1">DEV_LOGIN_PASSWORD</code> in{" "}
            <code className="rounded bg-black/35 px-1">.env.local</code>.
          </p>
          <button
            type="button"
            onClick={runDevQuickLogin}
            disabled={busy !== null}
            className="tap-scale mt-3 flex min-h-11 w-full items-center justify-center rounded-lg border border-amber-700/50 bg-amber-900/35 px-4 py-2.5 text-sm font-medium text-amber-50 hover:bg-amber-900/50 disabled:opacity-50 [-webkit-tap-highlight-color:transparent]"
          >
            {busy === "dev" ? "Signing in…" : "Quick login (dev)"}
          </button>
        </div>
      ) : null}
    </>
  );
}
