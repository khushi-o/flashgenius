"use server";

import { safeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/** Local dev only: signs in with fixed credentials from env (never use in production). */
export async function devQuickLogin(rawNext: string) {
  if (process.env.NODE_ENV !== "development") {
    return { ok: false as const, message: "Dev login is disabled." };
  }

  const email = process.env.DEV_LOGIN_EMAIL?.trim();
  const password = process.env.DEV_LOGIN_PASSWORD;
  if (!email || !password) {
    return {
      ok: false as const,
      message:
        "Set DEV_LOGIN_EMAIL and DEV_LOGIN_PASSWORD in .env.local (see .env.example).",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  redirect(safeNextPath(rawNext));
}
