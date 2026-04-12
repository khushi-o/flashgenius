import Link from "next/link";
import { DEMO_PDFS } from "@/lib/demo-pdfs";

export function DemoPdfSection() {
  return (
    <section className="landing-demo" aria-labelledby="demo-pdfs-heading">
      <div className="landing-demo-inner landing-fade-up d4">
        <h2 id="demo-pdfs-heading" className="landing-demo-title">
          Sample PDFs to try
        </h2>
        <p className="landing-demo-lead">
          Open any file in your browser, or download it to your device. After you{" "}
          <Link href="/login" className="landing-demo-inline-link">
            sign in
          </Link>
          , you&apos;ll be able to upload your own PDFs from the same device once
          upload is enabled in the app.
        </p>
        <p className="landing-demo-note">
          <strong>No shared demo password.</strong> Use Google or a magic link with
          your own email — it&apos;s free and keeps your decks private.
        </p>

        <ul className="landing-demo-grid">
          {DEMO_PDFS.map((d) => (
            <li key={d.href} className="landing-demo-card">
              <p className="landing-demo-card-title">{d.title}</p>
              <p className="landing-demo-card-blurb">{d.blurb}</p>
              <div className="landing-demo-card-actions">
                <a
                  href={d.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="landing-demo-link primary"
                >
                  Open
                </a>
                <a href={d.href} download className="landing-demo-link ghost">
                  Download
                </a>
              </div>
            </li>
          ))}
        </ul>

        <div className="landing-demo-cta-row">
          <Link href="/login" className="landing-demo-cta">
            Sign in to try FlashGenius
          </Link>
        </div>
      </div>
    </section>
  );
}
