import { CreateDeckForm } from "@/components/decks/CreateDeckForm";
import { NewDeckWelcome } from "@/components/decks/NewDeckWelcome";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import "../create-deck.css";

export default async function NewDeckPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/decks/new%3Fwelcome%3D1");
  }

  return (
    <div className="fg-new-page">
      <Suspense fallback={null}>
        <NewDeckWelcome />
      </Suspense>
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 sm:px-6">
        <CreateDeckForm />
      </div>
    </div>
  );
}
