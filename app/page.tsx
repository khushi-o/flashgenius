import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        FlashGenius
      </h1>
      <p className="mt-4 max-w-lg text-center text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        Smart flashcards from PDFs with spaced repetition.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        {user ? (
          <Link
            href="/decks"
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Go to decks
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
