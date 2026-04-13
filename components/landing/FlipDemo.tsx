"use client";

import type { MouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const ROTATE_MS = 5200;

const DEMO_CARDS = [
  {
    typeLabel: "definition",
    front: "What is the discriminant of a quadratic equation?",
    backTitle: "b² − 4ac",
    backBody:
      "Determines the number and type of roots. Positive → 2 real roots; zero → 1 repeated root; negative → 2 complex roots.",
  },
  {
    typeLabel: "contrast",
    front: "How does mitosis differ from meiosis in one line?",
    backTitle: "Diploid vs haploid goal",
    backBody:
      "Mitosis produces two identical diploid cells for growth/repair. Meiosis produces four genetically distinct haploid cells for reproduction.",
  },
  {
    typeLabel: "procedure",
    front: "What is the first step when balancing a chemical equation?",
    backTitle: "Count atoms",
    backBody:
      "List every element and count atoms on each side. Adjust coefficients (never subscripts) until atom counts match on both sides.",
  },
  {
    typeLabel: "cloze",
    front: "Complete: In Big-O, O(1) means ___ time regardless of input size.",
    backTitle: "constant",
    backBody:
      "O(1) means constant time: the operation does not grow meaningfully with n (e.g. array index lookup in a classic RAM model).",
  },
  {
    typeLabel: "misconception",
    front: "True or false: Correlation always implies causation.",
    backTitle: "False",
    backBody:
      "Two variables can move together because of a lurking variable, coincidence, or reverse causation—experiments or causal models test claims.",
  },
  {
    typeLabel: "definition",
    front: "What was the spinning jenny (Industrial Revolution)?",
    backTitle: "Multi-spindle spinning frame",
    backBody:
      "Hargreaves’ invention let one worker spin several threads at once—boosting textile output and helping factory production scale.",
  },
] as const;

function shouldIgnoreFlipClick(e: MouseEvent<HTMLDivElement>) {
  return Boolean((e.target as HTMLElement).closest("[data-grade]"));
}

export function FlipDemo() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const hoverPauseRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      if (hoverPauseRef.current || document.visibilityState !== "visible") return;
      setIndex((i) => (i + 1) % DEMO_CARDS.length);
      setFlipped(false);
    };
    const id = window.setInterval(tick, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  const card = DEMO_CARDS[index];

  const toggleFlip = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (shouldIgnoreFlipClick(e)) return;
    setFlipped((f) => !f);
  }, []);

  return (
    <div className="landing-flip-rotator">
      <p className="landing-flip-hint">
        Questions rotate on their own — still click the card to flip
      </p>
      <div
        className="landing-flip-scene"
        onMouseEnter={() => {
          hoverPauseRef.current = true;
        }}
        onMouseLeave={() => {
          hoverPauseRef.current = false;
        }}
        onFocusCapture={() => {
          hoverPauseRef.current = true;
        }}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            hoverPauseRef.current = false;
          }
        }}
      >
        <div
          key={index}
          className={`landing-flip-inner${flipped ? " flipped" : ""} landing-flip-inner-swap`}
          onClick={toggleFlip}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setFlipped((f) => !f);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Sample flashcard ${index + 1} of ${DEMO_CARDS.length}. ${flipped ? "Showing answer" : "Showing question"}`}
        >
          <div className="landing-flip-face">
            <span className="landing-type-badge landing-type-def">{card.typeLabel}</span>
            <p className="landing-q">{card.front}</p>
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
            <p className="landing-ans-title">{card.backTitle}</p>
            <p className="landing-ans-body">{card.backBody}</p>
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
      <div className="landing-flip-dots" role="tablist" aria-label="Sample card position">
        {DEMO_CARDS.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Card ${i + 1}`}
            className={`landing-flip-dot${i === index ? " landing-flip-dot-active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setIndex(i);
              setFlipped(false);
            }}
          />
        ))}
      </div>
    </div>
  );
}
