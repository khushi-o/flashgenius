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

- **[docs/COMPLETE_REFERENCE.md](./docs/COMPLETE_REFERENCE.md)** — end-to-end spec (APIs, SM-2, generation, validation, study/progress, build order).  
- **[docs/SECURITY.md](./docs/SECURITY.md)** — security regulations and operational plan.  
- **[docs/PHASES.md](./docs/PHASES.md)** — phased tasks + security work per phase.  
- **[docs/PLAN.md](./docs/PLAN.md)** — narrative build plan and card-quality system.  
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — overview ER / checklist.  
- **[supabase/migrations/001_initial_schema.sql](./supabase/migrations/001_initial_schema.sql)** — runnable schema + RLS + Storage.  
- Copy **[.env.example](./.env.example)** to `.env.local` when implementing.

## Local development (placeholder)

Once the app is scaffolded:

```bash
npm install
cp .env.example .env.local
# Fill server-side secrets only (never NEXT_PUBLIC_* for AI keys)
npm run dev
```

`.env.example` will list required variables when implementation lands.

## Security (submission requirement)

Full regulations, classification of secrets, Git rules, and a **pre-release checklist** are in **[docs/SECURITY.md](./docs/SECURITY.md)**. Phased work—including **security tasks per phase**—is in **[docs/PHASES.md](./docs/PHASES.md)**.

Summary:

- No API keys or DB credentials in the repo or client bundles.
- Use **server-side** environment variables only for LLM and sensitive Supabase operations.
- Public GitHub: placeholders in `.env.example` only; real values live in `.env.local` (see **[`.gitignore`](./.gitignore)**—ignored paths must never be committed).

## Submission checklist (Cuemath-style)

1. **Live URL** — deployed app.
2. **Video (2–5 min)** — walkthrough: upload → cards → study → progress; call out tradeoffs.
3. **Write-up** — this README + `docs/ARCHITECTURE.md` + `docs/SECURITY.md` (tradeoffs and how secrets stay server-side); what you’d improve with more time.
4. **Public GitHub repo** — this repository.

## License

TBD.
