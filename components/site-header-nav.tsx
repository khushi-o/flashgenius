"use client";

import { signOut } from "@/lib/actions/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function navButtonClass(active: boolean) {
  if (active) {
    return "tap-scale inline-flex min-h-11 min-w-[2.75rem] items-center gap-2 rounded-xl border border-p-sage/45 bg-p-sage/15 px-4 py-2.5 text-sm font-semibold text-p-cream shadow-inner shadow-black/20 transition-[background-color,border-color,color,transform] duration-150 hover:bg-p-sage/22 hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-p-sage/40 [-webkit-tap-highlight-color:transparent]";
  }
  return "tap-scale inline-flex min-h-11 min-w-[2.75rem] items-center gap-2 rounded-xl border border-p-sand/20 bg-p-navy-mid/60 px-4 py-2.5 text-sm font-medium text-p-sand transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:border-p-sage/35 hover:bg-p-navy-mid hover:text-p-cream hover:shadow-md hover:shadow-black/15 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-p-sage/30 [-webkit-tap-highlight-color:transparent]";
}

export function SiteHeaderNav() {
  const pathname = usePathname() ?? "";
  /** SSR + first client paint use empty path so active styles match (avoids React #418 hydration). */
  const [activePath, setActivePath] = useState("");
  useEffect(() => {
    setActivePath(pathname);
  }, [pathname]);

  const libraryActive = activePath.startsWith("/decks") && !activePath.startsWith("/decks/new");
  const studyActive = activePath.startsWith("/study");
  const uploadActive = activePath.startsWith("/decks/new");

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <nav className="hidden items-center gap-2 md:flex" aria-label="Main">
        <Link href="/decks" className={navButtonClass(libraryActive)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="block shrink-0 opacity-90" aria-hidden>
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
        <Link href="/study" className={navButtonClass(studyActive)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="block shrink-0 opacity-90" aria-hidden>
            <path
              d="M4 12h3l2-7 4 14 2-7h7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Study
        </Link>
        <Link href="/decks/new" className={navButtonClass(uploadActive)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="block shrink-0 opacity-90" aria-hidden>
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
      </nav>

      <nav className="flex items-center gap-2 md:hidden" aria-label="Main mobile">
        <Link
          href="/decks"
          className={`tap-scale inline-flex min-h-11 min-w-[4.25rem] items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.98] [-webkit-tap-highlight-color:transparent] ${libraryActive ? "bg-p-sage/25 text-p-cream hover:bg-p-sage/30" : "text-p-sand-dim hover:bg-p-sage/12 hover:text-p-cream"}`}
        >
          Library
        </Link>
        <Link
          href="/study"
          className={`tap-scale inline-flex min-h-11 min-w-[4.25rem] items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.98] [-webkit-tap-highlight-color:transparent] ${studyActive ? "bg-p-sage/25 text-p-cream hover:bg-p-sage/30" : "text-p-sand-dim hover:bg-p-sage/12 hover:text-p-cream"}`}
        >
          Study
        </Link>
        <Link
          href="/decks/new"
          className={`tap-scale inline-flex min-h-11 min-w-[4.25rem] items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.98] [-webkit-tap-highlight-color:transparent] ${uploadActive ? "bg-p-sage/25 text-p-cream hover:bg-p-sage/30" : "text-p-sand-dim hover:bg-p-sage/12 hover:text-p-cream"}`}
        >
          Upload
        </Link>
      </nav>

      <form action={signOut} className="shrink-0">
        <button
          type="submit"
          className="tap-scale min-h-11 rounded-lg px-4 text-sm text-p-sand-dim transition-[background-color,color,transform] duration-150 hover:bg-p-sage/10 hover:text-p-cream active:scale-[0.98] active:bg-p-sage/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-p-sage/30 [-webkit-tap-highlight-color:transparent]"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
