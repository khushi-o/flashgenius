import Link from "next/link";
import { FlipDemo } from "./FlipDemo";

function BrainLogoIcon() {
  return (
    <span className="landing-brand-mark" aria-hidden>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 4c-1.5 0-2.8.6-3.7 1.6C7.4 5 6.5 4.8 5.6 5.2c-1 .4-1.7 1.4-1.7 2.5 0 .3 0 .6.1.9-.6.5-1 1.3-1 2.2 0 .9.4 1.7 1 2.2-.1.3-.1.6-.1.9 0 1.1.7 2.1 1.7 2.5.9.4 1.8.2 2.7-.4.9 1 2.2 1.6 3.7 1.6s2.8-.6 3.7-1.6c.9.6 1.8.8 2.7.4 1-.4 1.7-1.4 1.7-2.5 0-.3 0-.6-.1-.9.6-.5 1-1.3 1-2.2 0-.9-.4-1.7-1-2.2.1-.3.1-.6.1-.9 0-1.1-.7-2.1-1.7-2.5-.9-.4-1.8-.2-2.7.4-.9-1-2.2-1.6-3.7-1.6Z"
          fill="url(#landing-brain-grad)"
        />
        <path
          d="M9 10h.01M12 10h.01M15 10h.01M10 13h4"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="landing-brain-grad" x1="4" y1="4" x2="20" y2="20">
            <stop stopColor="#0ea5e9" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

function HeroBookIcon() {
  return (
    <div className="landing-hero-icon-shell" aria-hidden>
      <div className="landing-hero-icon-glow" />
      <div className="landing-hero-icon-tile">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 3h9a2 2 0 012 2v16H8a2 2 0 00-2-2V3zm0 0v14a2 2 0 002 2h11"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 3H5a2 2 0 00-2 2v14a2 2 0 002 2h1"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="landing-root">
      <nav className="landing-nav landing-fade-up d0">
        <Link href="/" className="landing-nav-brand">
          <BrainLogoIcon />
          <span className="landing-nav-brand-text">
            <span className="landing-nav-brand-name">FlashGenius</span>
            <span className="landing-nav-brand-tag">Master through repetition</span>
          </span>
        </Link>
        <div className="landing-nav-actions">
          <Link href="/login?next=/decks" className="landing-nav-library">
            <LibraryGlyph />
            Library
          </Link>
          <Link href="/login?next=/decks/new" className="landing-nav-upload">
            <UploadGlyph />
            Upload
          </Link>
          <Link href="/login" className="landing-nav-signin">
            Sign in
          </Link>
        </div>
      </nav>

      <header className="landing-hero landing-fade-up d1">
        <HeroBookIcon />
        <h1 className="landing-hero-h1">Begin your mastery</h1>
        <p className="landing-hero-copy">
          Upload any PDF and watch it transform into intelligent flashcards. Built on
          cognitive science, designed for retention.
        </p>
        <Link href="/login?next=/decks/new" className="landing-hero-cta">
          <UploadGlyph />
          Create your first deck
        </Link>
      </header>

      <section className="landing-preview landing-fade-up d2" aria-label="Product preview">
        <div className="landing-preview-grid">
          <FlipDemo />
          <div className="landing-stats landing-fade-up d3">
            <p className="landing-stats-head">your deck · Quadratic Equations Ch.4</p>
            <div className="landing-stats-row">
              <div>
                <span className="landing-stat-num c1">34</span>
                <span className="landing-stat-label">total</span>
              </div>
              <div>
                <span className="landing-stat-num c2">8</span>
                <span className="landing-stat-label">learning</span>
              </div>
              <div>
                <span className="landing-stat-num c3">14</span>
                <span className="landing-stat-label">mature</span>
              </div>
              <div>
                <span className="landing-stat-num c4">7</span>
                <span className="landing-stat-label">due now</span>
              </div>
            </div>
            <Link href="/login?next=/decks" className="landing-stats-cta">
              Study 7 due cards
            </Link>
          </div>
        </div>

        <section className="landing-how" aria-labelledby="how-heading">
          <h2 id="how-heading">How it works</h2>
          <div className="landing-step">
            <div className="landing-step-num">1</div>
            <div>
              <h3>Upload a PDF</h3>
              <p>Any textbook chapter, lecture notes, or study guide</p>
            </div>
          </div>
          <div className="landing-step">
            <div className="landing-step-num">2</div>
            <div>
              <h3>AI generates typed cards</h3>
              <p>
                Definition, contrast, misconception, procedure, cloze — structured for
                recall
              </p>
            </div>
          </div>
          <div className="landing-step">
            <div className="landing-step-num">3</div>
            <div>
              <h3>Study with spaced repetition</h3>
              <p>Again / Hard / Good / Easy — SM-2 keeps what you learn</p>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}

function LibraryGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
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
  );
}

function UploadGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15V3m0 0l4 4m-4-4L8 7M4 19h16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
