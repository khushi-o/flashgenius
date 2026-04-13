import { AppLogoMark } from "@/components/app-logo";
import { SiteHeaderNav } from "@/components/site-header-nav";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-p-sand/15 bg-p-navy/85 backdrop-blur-md">
      <div className="flex h-14 w-full items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link href={user ? "/decks" : "/"} className="flex shrink-0 items-center gap-2.5">
          <AppLogoMark />
          <span className="text-sm font-semibold tracking-tight text-p-cream sm:text-base">FlashGenius</span>
        </Link>

        {user ? (
          <SiteHeaderNav />
        ) : (
          <Link
            href="/login"
            className="tap-scale inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-p-sage-bright hover:bg-p-sage/10 hover:text-p-cream [-webkit-tap-highlight-color:transparent]"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
