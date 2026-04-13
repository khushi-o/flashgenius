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

### Supabase (Phase 2 — upload & extraction)

1. In **SQL Editor**, also run [`supabase/migrations/002_storage_pdfs_update.sql`](./supabase/migrations/002_storage_pdfs_update.sql) (optional `UPDATE` policy on `pdfs` objects).  
2. While signed in: **Library** → **New deck** → choose a PDF → **Upload & extract PDF**. Files go to `pdfs/{user_id}/{deck_id}/…`, text is chunked into `deck_chunks`, and the deck status becomes `ready` (LLM card generation is Phase 3).  
3. Tune limits via `.env.local`: `MAX_UPLOAD_MB`, `CHUNK_CHAR_TARGET`, `CHUNK_OVERLAP_CHARS`, `MAX_CHUNKS_PER_DECK` (see `.env.example`).

### Phase 3 — LLM flashcards

1. Set **`GEMINI_API_KEY`** in `.env.local` (server-only; never `NEXT_PUBLIC_*`).  
2. After a deck is **`ready`** (upload + extraction done), open **Library** and click **Generate cards** for that deck.  
3. Optional: **`GENERATION_MAX_CHUNKS`**, **`MAX_CARDS_PER_DECK`**, **`DEDUPE_SIMILARITY_THRESHOLD`** to cap cost and near-duplicate fronts.

## Production (Vercel)

1. Create a Vercel project from this repo; set the **framework** to Next.js and use the default build (`npm run build`).  
2. In **Vercel → Settings → Environment Variables**, copy everything you use locally from [`.env.example`](./.env.example), at minimum:  
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   - `NEXT_PUBLIC_APP_URL` → your production origin (e.g. `https://your-app.vercel.app`) — used for absolute links and auth redirects.  
   - `GEMINI_API_KEY` (or your chosen `LLM_PROVIDER` keys) on the **server** only — never `NEXT_PUBLIC_*` for model keys.  
3. In **Supabase → Authentication → URL configuration**, set **Site URL** to the same production origin and add **`https://your-app.vercel.app/auth/callback`** (and `/login` if you use email magic links) under **Redirect URLs**.  
4. Before inviting real users, walk **[§11 Security checklist in docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md#11-security-checklist)** and extend it with any org-specific items (secret scan, key rotation, rate limits).  
5. Phase 6 product artifacts (screenshots, Loom) live outside the repo; capture them after the deploy is stable.

## License

TBD.
