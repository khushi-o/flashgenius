export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        FlashGenius
      </h1>
      <p className="mt-4 max-w-lg text-center text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        Smart flashcards from PDFs — app scaffold is live. Next up: Supabase, auth, and
        decks per the phased plan in{" "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
          docs/PHASES.md
        </code>
        .
      </p>
    </div>
  );
}
