import { StudySession } from "@/components/study/StudySession";
import { BackToLibraryLink } from "@/components/ui/back-to-library-link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ deck_id?: string }>;
};

export default async function StudyPage({ searchParams }: Props) {
  const q = await searchParams;
  const deckId = typeof q.deck_id === "string" ? q.deck_id.trim() : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const nextPath = deckId ? `/study?deck_id=${encodeURIComponent(deckId)}` : "/study";
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] w-full flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 pb-2 pt-6 sm:px-8 lg:px-12">
        <BackToLibraryLink className="-ml-1" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-p-cream">Study</h1>
        <p className="mt-2 text-sm text-p-sand-dim">
          Spaced repetition: show the question, recall the answer, then grade yourself honestly.
          {deckId ? " Only cards from this deck are in the queue." : " Queue mixes due reviews and new cards across your library."}
        </p>
      </div>
      <StudySession initialDeckId={deckId || null} />
    </div>
  );
}
