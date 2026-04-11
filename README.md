# FlashGenius

Smart flashcards from PDFs: upload a chapter or notes, get a practice-ready deck, then learn with **spaced repetition** and clear **progress** signals—built for long-term retention, not cramming.

## Problem picked

**Cuemath-style “Flashcard Engine”** — PDF ingestion with emphasis on card *quality* (concepts, definitions, relationships, edge cases, worked examples where relevant), not shallow Q/A scraping.

## What this repo will contain (target)

| Area | Intent |
|------|--------|
| Ingestion | PDF → text on the **server**; optional LLM pass for “teacher-quality” cards (keys never in the browser). |
| SRS | **SM-2** scheduling: due cards first, intervals from user grades (Again / Hard / Good / Easy). |
| Progress | Mastery buckets (e.g. new / learning / mature), due counts, session summaries. |
| Decks | List, search, resume last deck, caps on size for cost control. |

## Tech direction (free-tier friendly)

- **Next.js** (App Router) + API routes — single deployable app.
- **Postgres** via **Supabase** or **Neon** (free tiers).
- **File storage** for PDFs: Supabase Storage, R2, or similar (avoid huge blobs in DB rows when possible).
- **Deployment:** Vercel (frontend + serverless API).
- **AI (optional):** server-only env vars; consider Groq or similar free tiers, plus caps (max pages, max cards). Heuristic-only path possible for $0.

- **Local copies (gitignored, not on GitHub):** `docs/COMPLETE_REFERENCE.md`, `docs/SECURITY.md`, `docs/PHASES.md`, `docs/PLAN.md` — full spec, security rules, phased tasks, and product plan. Keep them on your machine next to the repo.  
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — overview ER / checklist (tracked in git).  
- **[supabase/migrations/001_initial_schema.sql](./supabase/migrations/001_initial_schema.sql)** — runnable schema + RLS + Storage.  
- Copy **[.env.example](./.env.example)** to `.env.local` when implementing.

## Local development

```bash
npm install
cp .env.example .env.local
# Fill server-side secrets only (never NEXT_PUBLIC_* for AI keys)
npm run dev
```

`.env.example` lists variables used as features land (Supabase, LLM, optional caps).

## Security (submission requirement)

**Never commit secrets** — real keys and `.env.local` stay on your machine and in the host’s env config only; the repo carries placeholders in `.env.example` (see `.gitignore`).

Full regulations, classification of secrets, Git rules, and a **pre-release checklist** live in your local **`docs/SECURITY.md`** (gitignored). Phased work—including **security tasks per phase**—is in local **`docs/PHASES.md`**.

Summary:

- No API keys or DB credentials in the repo or client bundles.
- Use **server-side** environment variables only for LLM and sensitive Supabase operations.
- Public GitHub: placeholders in `.env.example` only; real values live in `.env.local` (see **[`.gitignore`](./.gitignore)**—ignored paths must never be committed).

## Submission checklist (Cuemath-style)

1. **Live URL** — deployed app.
2. **Video (2–5 min)** — walkthrough: upload → cards → study → progress; call out tradeoffs.
3. **Write-up** — this README + `docs/ARCHITECTURE.md` + your local `docs/SECURITY.md` (or equivalent summary if you keep SECURITY gitignored); tradeoffs and how secrets stay server-side; what you’d improve with more time.
4. **Public GitHub repo** — this repository.

## License

TBD.
