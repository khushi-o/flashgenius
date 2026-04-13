"use client";

import { useCallback, useId, useState } from "react";

type Props = {
  index: number;
  cardType: string;
  difficulty: number;
  front: string;
  back: string;
};

export function DeckCardFlip({ index, cardType, difficulty, front, back }: Props) {
  const [revealed, setRevealed] = useState(false);
  const panelId = useId();

  const toggle = useCallback(() => {
    setRevealed((v) => !v);
  }, []);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40">
      <p className="border-b border-zinc-800/90 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Card {index} · {cardType} · difficulty {difficulty}
      </p>
      <button
        type="button"
        className="w-full px-4 py-4 text-left transition-colors hover:bg-zinc-800/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/70"
        onClick={toggle}
        aria-expanded={revealed}
        aria-controls={panelId}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          {revealed ? "Answer" : "Question"}
        </p>
        <p className="mt-1 font-medium text-zinc-100">{revealed ? back : front}</p>
        <p className="mt-3 text-xs text-sky-400/90">
          {revealed ? "Tap to hide answer" : "Tap to reveal answer"}
        </p>
      </button>
      <div id={panelId} className="sr-only" aria-live="polite">
        {revealed ? "Answer visible." : "Question visible."}
      </div>
    </div>
  );
}
