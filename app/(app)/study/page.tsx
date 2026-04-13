import { StudySession } from "@/components/study/StudySession";
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
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-white">Study</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Spaced repetition: show the question, recall the answer, then grade yourself honestly.
        {deckId ? " Only cards from this deck are in the queue." : " Queue mixes due reviews and new cards across your library."}
      </p>
      <StudySession initialDeckId={deckId || null} />
    </div>
  );
}
