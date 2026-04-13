/**
 * Library deck card row: neutral actions share one tactile style (ghost → sage on hover / press).
 * Use on <Link> and <button> for consistent “touch sensitive” feedback.
 */
export function deckRowNeutralActionClassName() {
  return [
    "tap-scale touch-manipulation inline-flex min-h-11 min-w-[2.75rem] items-center justify-center rounded-xl",
    "border border-p-sand/20 bg-p-navy-mid/50 px-4 py-2.5 text-xs font-semibold text-p-cream",
    "shadow-sm shadow-black/5 transition-[background-color,border-color,color,box-shadow,filter,transform] duration-150 ease-out",
    "hover:border-transparent hover:bg-gradient-to-r hover:from-p-sage hover:to-p-sage-muted hover:text-p-navy",
    "hover:shadow-md hover:shadow-black/25 hover:brightness-105",
    "active:scale-[0.97] active:border-transparent active:bg-gradient-to-r active:from-p-sage active:to-p-sage-muted active:text-p-navy active:shadow-md active:brightness-95",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-p-sage/45",
    "[-webkit-tap-highlight-color:transparent]",
  ].join(" ");
}

/** Destructive outline: same interaction pattern, red tint. */
export function deckRowDeleteOutlineClassName() {
  return [
    "tap-scale touch-manipulation inline-flex min-h-11 items-center justify-center rounded-xl",
    "border border-red-900/45 bg-transparent px-4 py-2.5 text-xs font-semibold text-red-200/95",
    "shadow-sm shadow-black/5 transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out",
    "hover:border-red-400/50 hover:bg-gradient-to-r hover:from-red-950/80 hover:to-red-900/55 hover:text-red-50",
    "hover:shadow-md hover:shadow-red-950/25",
    "active:scale-[0.97] active:border-transparent active:bg-gradient-to-r active:from-red-900 active:to-red-950 active:text-red-50 active:shadow-md",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/45",
    "disabled:opacity-50 [-webkit-tap-highlight-color:transparent]",
  ].join(" ");
}
