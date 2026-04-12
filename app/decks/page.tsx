import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DecksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/decks");
  }

  const { data: decks, error } = await supabase
    .from("decks")
    .select("id, title, status, card_count, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          Could not load decks: {error.message}. If the database is new, run{" "}
          <code className="rounded bg-red-100 px-1 dark:bg-red-900">
            supabase/migrations/001_initial_schema.sql
          </code>{" "}
          in the Supabase SQL editor.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Your decks
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Signed in as {user.email ?? user.id}
          </p>
        </div>
      </div>

      {!decks?.length ? (
        <div className="mt-12 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-14 text-center dark:border-zinc-600 dark:bg-zinc-900/40">
          <p className="text-zinc-700 dark:text-zinc-300">No decks yet.</p>
          <p className="mt-2 text-sm text-zinc-500">
            PDF upload and generation arrive in the next phases.
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
          {decks.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-4 px-4 py-3 first:rounded-t-xl last:rounded-b-xl"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {d.title}
                </p>
                <p className="text-xs text-zinc-500">
                  {d.status} · {d.card_count} cards
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-center text-sm text-zinc-500">
        <Link href="/" className="text-zinc-700 underline dark:text-zinc-300">
          Home
        </Link>
      </p>
    </div>
  );
}
