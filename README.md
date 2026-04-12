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

- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — high-level overview and checklist.  
- **[supabase/migrations/001_initial_schema.sql](./supabase/migrations/001_initial_schema.sql)** — runnable schema + RLS + Storage.  
- **[.env.example](./.env.example)** — variable names only; copy to `.env.local` for real values and do not commit `.env.local`.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

### Supabase (Phase 1)

1. Create a project at [supabase.com](https://supabase.com).  
2. In **SQL Editor**, run [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql) (schema, RLS, `pdfs` bucket).  
3. **Authentication → Providers:** enable **Email** (magic link) and **Google** (add OAuth client id/secret from Google Cloud Console).  
4. **Authentication → URL configuration:** set **Site URL** to `http://localhost:3000` (and your production URL later). Under **Redirect URLs**, add `http://localhost:3000/auth/callback` and the same for production.  
5. Put **Project URL** and **anon public** key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Do **not** put the service role key in the client; use it only in server code if you truly need it.

## License

TBD.
