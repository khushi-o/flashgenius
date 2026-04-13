"use client";

import { updateDisplayName } from "@/lib/actions/profile";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

type Props = { initialDisplayName: string | null };

export function LibraryGreeting({ initialDisplayName }: Props) {
  const router = useRouter();
  const [savedName, setSavedName] = useState((initialDisplayName ?? "").trim());
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setErr(null);
    startTransition(async () => {
      const r = await updateDisplayName(draft);
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      setSavedName(draft.trim());
      setDraft("");
      setEditing(false);
      router.refresh();
    });
  }

  if (savedName && !editing) {
    return (
      <div className="mt-1 flex items-start gap-3">
        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-p-sage/30 bg-p-sage/10 text-p-sage-bright">
          <UserCircleIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-p-cream">
              Hey there, <span className="text-p-sage-bright">{savedName}</span>
            </h1>
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setDraft(savedName);
                setErr(null);
              }}
              className="tap-scale -ml-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-p-sand-dim transition-[background-color,color,transform] hover:bg-p-sage/15 hover:text-p-sage-bright active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-p-sage/40 [-webkit-tap-highlight-color:transparent]"
              aria-label="Edit display name"
              title="Edit display name"
            >
              <PencilIcon className="h-[1.125rem] w-[1.125rem]" />
            </button>
          </div>
          <p className="mt-1 text-base text-p-sand-dim sm:text-lg">{"Here's your library."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-0 max-w-md">
      <h1 className="text-3xl font-semibold tracking-tight text-p-cream">Your library</h1>
      <p className="mt-1 text-sm text-p-sand-dim sm:text-base">
        {editing
          ? "Update the name we use when we greet you."
          : "Tell us what to call you. You can change this anytime."}
      </p>
      <label
        className="mt-3 block text-sm font-medium text-p-sand-dim"
        htmlFor="library-display-name"
      >
        {editing ? "Name" : "What should we call you?"}
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          id="library-display-name"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={80}
          autoComplete="nickname"
          placeholder="Your name"
          className="min-h-11 w-full flex-1 rounded-xl border border-p-sand/20 bg-p-navy-mid/70 px-3 py-2.5 text-sm text-p-cream placeholder:text-p-sand-dim focus:border-p-sage/50 focus:outline-none focus:ring-2 focus:ring-p-sage/25"
        />
        <div className="flex gap-2 sm:shrink-0">
          {savedName ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setEditing(false);
                setDraft("");
                setErr(null);
              }}
              className="tap-scale inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-p-sand/25 px-4 text-sm font-medium text-p-sand transition-colors hover:bg-p-navy-mid disabled:opacity-50 sm:flex-none [-webkit-tap-highlight-color:transparent]"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending || !draft.trim()}
            onClick={() => void save()}
            className="tap-scale inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-p-sage to-p-sage-muted px-5 text-sm font-semibold text-p-navy shadow-sm shadow-black/25 transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none [-webkit-tap-highlight-color:transparent]"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      {err ? (
        <p className="mt-2 text-sm text-red-300" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
