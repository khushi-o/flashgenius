import { safeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForms } from "./login-forms";
import "./login.css";

type Props = {
  searchParams: Promise<{
    error?: string;
    check_email?: string;
    next?: string;
  }>;
};

const DEFAULT_POST_LOGIN = "/decks/new?welcome=1";

export default async function LoginPage({ searchParams }: Props) {
  const q = await searchParams;
  const nextPath = safeNextPath(q.next ?? DEFAULT_POST_LOGIN);
  const devQuickLoginEnabled =
    process.env.NODE_ENV === "development" &&
    Boolean(
      process.env.DEV_LOGIN_EMAIL?.trim() && process.env.DEV_LOGIN_PASSWORD,
    );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(nextPath);
  }

  return (
    <div className="fg-login-root">
      <div className="fg-login-grid">
        <div className="fg-login-story">
          <p className="fg-login-badge" aria-hidden>
            <span>◆</span> Learn, not cram
          </p>
          <h1>
            Turn notes into <span>cards that stick</span>
          </h1>
          <p>
            Sign in once. Right after, you&apos;ll drop in a PDF and we&apos;ll prep it for
            spaced practice — the part that actually builds retention.
          </p>
          <div className="fg-login-pipeline" aria-hidden>
            <span className="fg-login-pipeline-item">PDF in</span>
            <span className="fg-login-pipeline-arrow">→</span>
            <span className="fg-login-pipeline-item">Smart chunks</span>
            <span className="fg-login-pipeline-arrow">→</span>
            <span className="fg-login-pipeline-item">Practice deck</span>
            <span className="fg-login-pipeline-arrow">→</span>
            <span className="fg-login-pipeline-item">SRS reviews</span>
          </div>
        </div>

        <div className="fg-login-card">
          <h2 className="fg-login-card-title">Sign in</h2>
          <p className="fg-login-card-sub">
            Magic link or Google. Next stop: upload your first document.
          </p>

          {q.check_email ? (
            <p className="fg-login-check" role="status">
              Check your email for the sign-in link. When you click it, we&apos;ll take you
              straight to the upload step.
            </p>
          ) : null}

          {q.error ? (
            <p className="fg-login-err" role="alert">
              {q.error}
            </p>
          ) : null}

          <LoginForms
            nextPath={nextPath}
            devQuickLoginEnabled={devQuickLoginEnabled}
          />
        </div>

        <p className="fg-login-foot">
          <Link href="/">Back to home</Link>
          {" · "}
          <Link href="/login?next=%2Fdecks">Library first</Link>
        </p>
      </div>
    </div>
  );
}
