"use client";

import type { ReactNode } from "react";
import { useCallback, useId, useState } from "react";

type TabId = "cards" | "progress";

export function DeckDetailTabs(props: { cards: ReactNode; progress: ReactNode }) {
  const baseId = useId();
  const [tab, setTab] = useState<TabId>("cards");

  const select = useCallback((next: TabId) => {
    setTab(next);
  }, []);

  const cardsId = `${baseId}-cards`;
  const progressId = `${baseId}-progress`;

  return (
    <div className="mt-8">
      <div
        role="tablist"
        aria-label="Deck sections"
        className="flex gap-1 border-b border-p-sand/10"
      >
        <button
          type="button"
          role="tab"
          id={cardsId}
          aria-selected={tab === "cards"}
          aria-controls={`${cardsId}-panel`}
          tabIndex={tab === "cards" ? 0 : -1}
          onClick={() => select("cards")}
          className={
            tab === "cards"
              ? "tap-scale inline-flex min-h-11 items-center border-b-2 border-p-sage px-4 py-2.5 text-sm font-semibold text-p-sage-bright [-webkit-tap-highlight-color:transparent]"
              : "tap-scale inline-flex min-h-11 items-center border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-p-sand-dim hover:text-p-cream [-webkit-tap-highlight-color:transparent]"
          }
        >
          Cards
        </button>
        <button
          type="button"
          role="tab"
          id={progressId}
          aria-selected={tab === "progress"}
          aria-controls={`${progressId}-panel`}
          tabIndex={tab === "progress" ? 0 : -1}
          onClick={() => select("progress")}
          className={
            tab === "progress"
              ? "tap-scale inline-flex min-h-11 items-center border-b-2 border-p-sage px-4 py-2.5 text-sm font-semibold text-p-sage-bright [-webkit-tap-highlight-color:transparent]"
              : "tap-scale inline-flex min-h-11 items-center border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-p-sand-dim hover:text-p-cream [-webkit-tap-highlight-color:transparent]"
          }
        >
          Progress
        </button>
      </div>

      <div
        id={`${cardsId}-panel`}
        role="tabpanel"
        aria-labelledby={cardsId}
        hidden={tab !== "cards"}
        className={tab === "cards" ? "mt-6" : "hidden"}
      >
        {props.cards}
      </div>
      <div
        id={`${progressId}-panel`}
        role="tabpanel"
        aria-labelledby={progressId}
        hidden={tab !== "progress"}
        className={tab === "progress" ? "mt-6" : "hidden"}
      >
        {props.progress}
      </div>
    </div>
  );
}
