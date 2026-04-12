"use server";

import { safeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

async function authCallbackUrl(nextPath: string): Promise<string> {
  const h = await headers();
  const nextQ = `?next=${encodeURIComponent(nextPath)}`;
  const origin = h.get("origin");
  if (origin) return `${origin}/auth/callback${nextQ}`;
  const host = h.get("host");
  if (host) {
    const proto = host.startsWith("localhost") ? "http" : "https";
    return `${proto}://${host}/auth/callback${nextQ}`;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/auth/callback${nextQ}`;
}

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const nextPathEarly = safeNextPath(String(formData.get("next") ?? ""));
  if (!email) {
    redirect(
      `/login?error=missing_email&next=${encodeURIComponent(nextPathEarly)}`,
    );
  }

  const nextPath = nextPathEarly;
  const supabase = await createClient();
  const redirectTo = await authCallbackUrl(nextPath);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(nextPath)}`,
    );
  }
  redirect(`/login?check_email=1&next=${encodeURIComponent(nextPath)}`);
}

export async function signInWithGoogle(formData: FormData) {
  const nextPath = safeNextPath(String(formData.get("next") ?? ""));
  const supabase = await createClient();
  const redirectTo = await authCallbackUrl(nextPath);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent(error?.message ?? "oauth_failed")}&next=${encodeURIComponent(nextPath)}`,
    );
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
