import Link from "next/link";
import { safeNextPath } from "@/lib/auth/safe-next";
import { signInWithGoogle, signInWithMagicLink } from "./actions";

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

      <form action={signInWithMagicLink} className="mt-8 flex flex-col gap-3">
        <input type="hidden" name="next" value={nextPath} />
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 shadow-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            placeholder="you@example.com"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Send magic link
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

      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={nextPath} />
        <button
          type="submit"
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Continue with Google
        </button>
      </form>

      <p className="mt-10 text-center text-sm text-zinc-500">
        <Link href="/" className="text-zinc-700 underline dark:text-zinc-300">
          Back to home
        </Link>
      </p>
    </div>
  );
}
