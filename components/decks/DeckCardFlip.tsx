"use client";

import type { ReactNode } from "react";
import { useCallback, useId, useState } from "react";

type Props = {
  index: number;
  cardType: string;
  difficulty: number;
  front: string;
  back: string;
  /** Optional controls (e.g. edit / delete) shown in the header row. */
  actions?: ReactNode;
};

export function DeckCardFlip({ index, cardType, difficulty, front, back, actions }: Props) {
  const [revealed, setRevealed] = useState(false);
  const panelId = useId();

  const toggle = useCallback(() => {
    setRevealed((v) => !v);
  }, []);

  return (
    <div className="rounded-xl border border-p-sand/15 bg-p-navy-mid/50">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-p-sand/10 px-4 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-p-sand-dim">
          Card {index} · {cardType} · difficulty {difficulty}
        </p>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div> : null}
      </div>
      <button
        type="button"
        className="tap-scale w-full min-h-[4.5rem] px-4 py-4 text-left transition-colors hover:bg-p-navy/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-p-sage/50 [-webkit-tap-highlight-color:transparent]"
        onClick={toggle}
        aria-expanded={revealed}
        aria-controls={panelId}
      >
        {!revealed ? (
          <>
            <p className="text-lg font-medium leading-relaxed text-p-cream sm:text-xl">{front}</p>
            <p className="mt-3 text-xs text-p-sage-bright/90">Tap to reveal answer</p>
          </>
        ) : (
          <>
            <p className="text-lg font-medium leading-relaxed text-p-cream sm:text-xl">{front}</p>
            <div className="mt-5 border-t border-p-sand/20 pt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-p-sand-dim">
                Answer
              </p>
              <p className="text-base leading-relaxed text-p-cream/95 sm:text-lg">{back}</p>
            </div>
            <p className="mt-3 text-xs text-p-sage-bright/90">Tap to hide answer</p>
          </>
        )}
      </button>
      <div id={panelId} className="sr-only" aria-live="polite">
        {revealed ? "Answer visible." : "Question visible."}
      </div>
    </div>
  );
}
