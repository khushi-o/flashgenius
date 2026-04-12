"use client";

import type { MouseEvent } from "react";

function toggleFlipInner(e: MouseEvent<HTMLDivElement>) {
  const t = e.target as HTMLElement;
  if (t.closest("[data-grade]")) return;
  document.getElementById("flip-inner")?.classList.toggle("flipped");
}

export function FlipDemo() {
  return (
    <div>
      <p className="landing-flip-hint">click the card to flip it</p>
      <div className="landing-flip-scene">
        <div
          id="flip-inner"
          className="landing-flip-inner"
          onClick={toggleFlipInner}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById("flip-inner")?.classList.toggle("flipped");
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="landing-flip-face">
            <span className="landing-type-badge landing-type-def">definition</span>
            <p className="landing-q">
              What is the discriminant of a quadratic equation?
            </p>
            <div className="landing-tap-hint">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M4 4v6h6M20 20v-6h-6M20 4l-6 6M4 20l6-6"
                  stroke="#888780"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Tap to reveal answer
            </div>
          </div>
          <div className="landing-flip-face landing-flip-back">
            <span className="landing-type-badge landing-type-ans">answer</span>
            <p className="landing-ans-title">b² − 4ac</p>
            <p className="landing-ans-body">
              Determines the number and type of roots. Positive → 2 real roots;
              zero → 1 repeated root; negative → 2 complex roots.
            </p>
            <div className="landing-grades">
              <button
                type="button"
                data-grade
                className="landing-grade landing-grade-g1"
                onClick={(e) => e.stopPropagation()}
              >
                Again
              </button>
              <button
                type="button"
                data-grade
                className="landing-grade landing-grade-g2"
                onClick={(e) => e.stopPropagation()}
              >
                Hard
              </button>
              <button
                type="button"
                data-grade
                className="landing-grade landing-grade-g3"
                onClick={(e) => e.stopPropagation()}
              >
                Good
              </button>
              <button
                type="button"
                data-grade
                className="landing-grade landing-grade-g4"
                onClick={(e) => e.stopPropagation()}
              >
                Easy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
