import { GenerateDeckButton } from "@/components/decks/GenerateDeckButton";
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
    .select("id, title, status, card_count, generation_error, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="rounded-lg border border-red-900/60 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          Could not load decks: {error.message}. If the database is new, run{" "}
          <code className="rounded bg-red-950 px-1 text-red-100">
            supabase/migrations/001_initial_schema.sql
          </code>{" "}
          in the Supabase SQL editor.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Library
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Signed in as {user.email ?? user.id}
          </p>
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-zinc-600">
            Each trip through <strong className="text-zinc-500">New deck</strong> creates a{" "}
            <strong className="text-zinc-500">separate</strong> row, even if the PDF title
            matches. Pick the row you want, generate once, then{" "}
            <strong className="text-zinc-500">View cards</strong> to read them.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/study"
            className="inline-flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-950/50 px-4 py-2.5 text-sm font-semibold text-violet-100 hover:bg-violet-900/50"
          >
            Study queue
          </Link>
          <Link
            href="/decks/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/25 hover:brightness-110"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 15V3m0 0l4 4m-4-4L8 7M4 19h16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            New deck
          </Link>
        </div>
      </div>

      {!decks?.length ? (
        <div className="mt-12 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-16 text-center">
          <p className="text-zinc-200">No decks yet.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Create a deck, upload a PDF, then generate flashcards from the extracted
            text.
          </p>
          <Link
            href="/decks/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white hover:brightness-110"
          >
            Create your first deck
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/30">
          {decks.map((d) => (
            <li
              key={d.id}
              className="flex flex-col gap-3 px-4 py-3 first:rounded-t-2xl last:rounded-b-2xl sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link
                    href={`/decks/${d.id}`}
                    className="font-medium text-zinc-100 hover:text-sky-300 hover:underline"
                  >
                    {d.title}
                  </Link>
                  {d.card_count > 0 ? (
                    <Link
                      href={`/decks/${d.id}`}
                      className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300 hover:bg-zinc-700"
                    >
                      View cards
                    </Link>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {d.status} · {d.card_count} cards
                  {d.created_at
                    ? ` · created ${new Date(d.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : ""}
                  {d.status === "error" && d.generation_error
                    ? ` — ${d.generation_error}`
                    : ""}
                </p>
              </div>
              <GenerateDeckButton deckId={d.id} status={d.status} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-center text-sm text-zinc-600">
        <Link href="/" className="text-sky-500 hover:text-sky-400 hover:underline">
          Home
        </Link>
      </p>
    </div>
  );
}
