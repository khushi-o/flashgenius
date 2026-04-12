import Link from "next/link";
import { DemoPdfSection } from "./DemoPdfSection";
import { FlipDemo } from "./FlipDemo";

function BookIcon() {
  return (
    <span className="landing-logo-icon" aria-hidden>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6 3h9a2 2 0 012 2v16H8a2 2 0 00-2-2V3zm0 0v14a2 2 0 002 2h11"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 3H5a2 2 0 00-2 2v14a2 2 0 002 2h1"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Landing() {
  return (
    <div className="landing-root">
      <div className="landing-grid">
        <nav className="landing-nav landing-fade-up d0">
          <Link href="/" className="landing-nav-brand">
            <BookIcon />
            FlashGenius
          </Link>
          <Link href="/login" className="landing-btn-signin">
            Sign in
          </Link>
        </nav>

        <div className="landing-fade-up d1">
          <div className="landing-pill-row">
            <span className="landing-pill">Free forever</span>
            <span className="landing-pill">No credit card</span>
            <span className="landing-pill">SM-2 algorithm</span>
          </div>
          <h1 className="landing-h1">Study smarter. Not harder.</h1>
          <p className="landing-sub">
            Drop a PDF. Get a deck of expert-quality flashcards in under 2 minutes.
            Spaced repetition handles the rest.
          </p>
          <Link href="/login" className="landing-cta-main">
            Upload your first PDF
          </Link>

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
                  Definition, contrast, misconception, procedure, cloze — streamed
                  live
                </p>
              </div>
            </div>
            <div className="landing-step">
              <div className="landing-step-num">3</div>
              <div>
                <h3>Study with spaced repetition</h3>
                <p>Grade cards Again / Hard / Good / Easy — SM-2 does the rest</p>
              </div>
            </div>
          </section>
        </div>

        <div className="landing-fade-up d2">
          <FlipDemo />
          <div className="landing-stats landing-fade-up d3">
            <p className="landing-stats-head">
              your deck · Quadratic Equations Ch.4
            </p>
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
            <Link href="/login" className="landing-stats-cta">
              Study 7 due cards
            </Link>
          </div>
        </div>
      </div>

      <DemoPdfSection />
    </div>
  );
}
