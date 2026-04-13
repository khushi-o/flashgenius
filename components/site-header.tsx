import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-zinc-800/80 bg-black/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-white"
        >
          FlashGenius
        </Link>
        <nav className="flex items-center gap-3 text-sm sm:gap-4">
          {user ? (
            <>
              <Link
                href="/decks"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-medium text-zinc-200 hover:bg-zinc-800"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="opacity-80"
                  aria-hidden
                >
                  <path
                    d="M4 19.5A2.5 2.5 0 016.5 17H20"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
                Library
              </Link>
              <Link
                href="/study"
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-950/50 px-3 py-1.5 font-medium text-violet-100 hover:bg-violet-900/50"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="opacity-80"
                  aria-hidden
                >
                  <path
                    d="M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                Study
              </Link>
              <Link
                href="/decks/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-violet-600 px-3 py-1.5 font-semibold text-white shadow-md shadow-sky-900/30 hover:brightness-110"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M12 15V3m0 0l4 4m-4-4L8 7M4 19h16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Upload
              </Link>
              <form action={signOut} className="ml-1">
                <button
                  type="submit"
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="font-medium text-sky-400 hover:text-sky-300"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
