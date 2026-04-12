import Link from "next/link";
import { safeNextPath } from "@/lib/auth/safe-next";
import { LoginForms } from "./login-forms";

type Props = {
  searchParams: Promise<{
    error?: string;
    check_email?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const q = await searchParams;
  const nextPath = safeNextPath(q.next ?? "");

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Magic link or Google. Configure providers and redirect URLs in the Supabase
        dashboard.
      </p>

      {q.check_email ? (
        <p className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          Check your email for the sign-in link.
        </p>
      ) : null}

      {q.error ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {q.error}
        </p>
      ) : null}

      <LoginForms nextPath={nextPath} />

      <p className="mt-10 text-center text-sm text-zinc-500">
        <Link href="/" className="text-zinc-700 underline dark:text-zinc-300">
          Back to home
        </Link>
      </p>
    </div>
  );
}
