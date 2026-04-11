# FlashGenius — Phased task plan (with security work)

Each phase lists **product tasks** and **security tasks**. Exit criteria must be met before treating the phase as done. High-level product narrative remains in **[PLAN.md](./PLAN.md)**; technical detail in **[COMPLETE_REFERENCE.md](./COMPLETE_REFERENCE.md)**.

---

## Phase 0 — Repository and security baseline

**Goal:** Safe foundation before feature code accumulates.

### Product / infra

- [x] Initialize Next.js app (App Router, TypeScript, Tailwind) if not already present.  
- [x] Add root **`.gitignore`** (see repo root—covers env, keys, build artifacts, local Supabase).  
- [x] Verify `git status` does not track `.env.local`, `.env`, or key files.

### Security (required)

- [ ] Read **[SECURITY.md](./SECURITY.md)** end-to-end.  
- [x] Add **`.env.example`** only (no real values); ensure `.env` / `.env.*.local` are ignored.  
- [x] Add `README` pointer to security doc and “never commit secrets” one-liner.  
- [ ] (Optional) Install **secret scanning** in CI (e.g. Gitleaks, TruffleHog) or run manually before each push.

**Exit criteria:** Clean clone builds without secrets; `.gitignore` committed; SECURITY.md accepted as team rules.

---

## Phase 1 — Supabase, schema, auth

**Goal:** Database + RLS + sign-in; still no LLM or PDF pipeline required.

### Product

- [ ] Create Supabase project (dev).  
- [ ] Run [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql) (or CLI linked migration).  
- [ ] Configure Supabase Auth: magic link + Google OAuth.  
- [ ] Implement auth UI (`/login`) and session middleware / server client pattern.  
- [ ] Empty **decks** list page for signed-in user.

### Security

- [ ] Confirm **RLS** enabled and policies match COMPLETE_REFERENCE (profiles, decks, chunks, cards, reviews, storage).  
- [ ] Smoke test: user A cannot `select` user B’s rows (Table Editor or SQL as A).  
- [ ] Store **only** `NEXT_PUBLIC_SUPABASE_*` + anon usage in client; **no** service role in browser code.  
- [ ] Register **redirect URLs** in Supabase (localhost + future prod URL placeholder).

**Exit criteria:** Sign-in works; RLS verified; no Tier A keys in client bundle (inspect build output or Vite/Next analyze if needed).

---

## Phase 2 — PDF upload, storage, extraction

**Goal:** PDF → chunks in DB; files private per user.

### Product

- [ ] `POST /api/decks`, `POST /api/decks/[id]/upload`.  
- [ ] Supabase Storage upload to `pdfs` bucket with path `{user_id}/{deck_id}/...`.  
- [ ] `pdf-parse` extraction + chunking (`lib/pdf/*`).  
- [ ] Persist `deck_chunks`; update `decks.status` lifecycle.

### Security

- [ ] **Validate** `Content-Type` and magic bytes where practical; reject non-PDF.  
- [ ] **Enforce** `MAX_UPLOAD_MB` server-side.  
- [ ] Confirm Storage **RLS**: user cannot read/write another user’s prefix.  
- [ ] Do not log full file paths with tokens in client-visible errors.

**Exit criteria:** Upload works; object not world-readable; oversize/non-PDF rejected.

---

## Phase 3 — Generation (Pass A / B, SSE, validator)

**Goal:** Streaming cards; quality gate before insert.

### Product

- [ ] `lib/generation/*` (LLM adapter, Pass A/B, tone presets, validator, dedupe).  
- [ ] `POST /api/decks/[id]/generate` with SSE.  
- [ ] Cap chunks/cards per env; JSON repair on model output.

### Security

- [ ] LLM keys **only** server env; verify `process.env.GEMINI_API_KEY` never referenced from client components.  
- [ ] **Rate limit** generate route (per user / hour).  
- [ ] On insert, set `cards.user_id` = `auth.uid()` (or server-verified user) for RLS.  
- [ ] No raw model dump (with user PDF text) returned to client beyond needed card fields.

**Exit criteria:** Network tab shows no API keys; abuse limited by rate cap.

---

## Phase 4 — Study loop (SM-2, queue, review)

**Goal:** Grading updates SRS state correctly.

### Product

- [ ] `lib/sm2.ts`; `GET /api/study/queue`, `POST /api/study/review`.  
- [ ] Study UI: flip, grade buttons, keyboard shortcuts.  
- [ ] `review_events` append-only log.

### Security

- [ ] Review endpoint checks `card_id` belongs to **session user** (via join `cards` → `decks.user_id` or `cards.user_id`).  
- [ ] Reject forged `deck_id` / `card_id` from other users (404 or 403, not 500).  
- [ ] No PII of other users in error messages.

**Exit criteria:** Cross-user review attempt fails safely.

---

## Phase 5 — Deck library, edit, progress

**Goal:** Polish, edit cards, dashboards.

### Product

- [ ] `GET /api/decks` with aggregates; deck detail tabs; `PATCH` / `DELETE` cards.  
- [ ] Re-run validator on PATCH.  
- [ ] Progress UI (mastery ring, buckets, streak).

### Security

- [ ] All deck/card routes scoped by authenticated user.  
- [ ] Pagination on list endpoints to avoid huge responses (DoS / data exfil shape).

**Exit criteria:** Library and edit flows respect ownership; validator on edit.

---

## Phase 6 — Deploy, harden, submit

**Goal:** Public URL + submission artifacts.

### Product

- [ ] Vercel project; env vars; `NEXT_PUBLIC_APP_URL` production.  
- [ ] README setup + screenshots.  
- [ ] Loom walkthrough (no secrets on screen).

### Security

- [ ] Complete **[SECURITY.md §9](./SECURITY.md)** pre-release checklist.  
- [ ] Production Supabase redirect URLs updated.  
- [ ] Rotate any key that ever appeared in a commit or screenshot.  
- [ ] Final `git grep` / secret scan clean.

**Exit criteria:** Live demo URL; public GitHub clean; submission email ready.

---

## Phase map (summary)

| Phase | Focus | Security theme |
|-------|--------|----------------|
| 0 | Repo + gitignore + docs | Secret hygiene |
| 1 | DB + auth + RLS | Identity + row access |
| 2 | PDF + Storage | Upload validation + object RLS |
| 3 | LLM generation | Key isolation + rate limits |
| 4 | SRS + study API | Authorization on mutations |
| 5 | Library + edit + progress | Scoped reads + safe errors |
| 6 | Ship | Scan + rotate + redirects |

---

## Document map

| File | Role |
|------|------|
| [SECURITY.md](./SECURITY.md) | Regulations and operational security plan |
| [PHASES.md](./PHASES.md) | This file — phased tasks + security per phase |
| [PLAN.md](./PLAN.md) | Product plan and quality system |
| [COMPLETE_REFERENCE.md](./COMPLETE_REFERENCE.md) | APIs, schema, algorithms |
