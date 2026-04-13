"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function NewDeckWelcome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const welcome = searchParams.get("welcome") === "1";

  const dismiss = useCallback(() => {
    router.replace("/decks/new");
  }, [router]);

  if (!welcome) return null;

  return (
    <div className="fg-new-welcome">
      <div className="fg-new-welcome-inner">
        <div className="fg-new-welcome-copy">
          <p className="fg-new-welcome-kicker">You&apos;re in</p>
          <h2 className="fg-new-welcome-title">Let&apos;s build your first deck</h2>
          <p className="fg-new-welcome-text">
            Drop a chapter or notes below. We extract the text, then you can generate
            flashcards from the Library when you&apos;re ready.
          </p>
        </div>
        <div className="fg-new-welcome-steps" aria-label="What happens next">
          <div className="fg-new-welcome-step fg-new-welcome-step-active">
            <span className="fg-new-welcome-step-num">1</span>
            <span>Upload PDF</span>
          </div>
          <div className="fg-new-welcome-step">
            <span className="fg-new-welcome-step-num">2</span>
            <span>Extract &amp; chunk</span>
          </div>
          <div className="fg-new-welcome-step">
            <span className="fg-new-welcome-step-num">3</span>
            <span>Generate cards</span>
          </div>
        </div>
        <div className="fg-new-welcome-actions">
          <button type="button" className="fg-new-welcome-dismiss" onClick={dismiss}>
            Got it
          </button>
          <Link href="/decks" className="fg-new-welcome-library">
            Library instead
          </Link>
        </div>
      </div>
    </div>
  );
}
