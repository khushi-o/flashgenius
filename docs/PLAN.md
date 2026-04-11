# FlashGenius — Final build plan

This document is the **execution-oriented plan**: what we build, in what order, and how **card quality** is first-class infrastructure alongside **SM-2**. **Resolved values, SQL, APIs, and algorithms** live in **[COMPLETE_REFERENCE.md](./COMPLETE_REFERENCE.md)**; `ARCHITECTURE.md` stays as a shorter overview.

---

## 1. Product promise

- Drop a **PDF** → get a **practice-ready** deck with **domain-faithful vocabulary** (no careless synonym-swapping).
- **Spaced repetition (SM-2)** schedules what comes back and when.
- **Progress** is clear (new / learning / mature, due counts)—motivating, not noisy.
- **Deck library**: browse, search, resume.
- **Trust**: preview and **edit** cards before and after study; bad AI output does not stick.

---

## 2. Non-negotiables (submission + quality)

| Item | Why |
|------|-----|
| **Server-only LLM keys** | Security requirement; no `NEXT_PUBLIC_*` for AI. |
| **Two-pass generation** | Differentiator vs single “text → cards” call; outline then typed cards. |
| **Validator + dedupe** | Cheap gate before DB; cuts vague and duplicate cards. |
| **Tone presets** | Same engine, three UX-visible “modes” (exam / deep / quick). |
| **Preview / edit flow** | Evaluator trust signal; fixes bad generations without re-running AI. |
| **SM-2 + study UI** | Core “after the conversion” magic. |
| **Deploy + public URL** | Hard requirement for hand-in. |

---

## 3. Card quality system (first-class)

### 3.1 Two-pass pipeline

1. **Pass A — concept outline** (per text chunk; strict JSON)  
   Output: array of `{ concept, type, importance, source_hint }`  
   - `type` ∈ `definition | contrast | misconception | procedure | cloze`  
   - `importance` ∈ `1 | 2 | 3` (core / supporting / detail)  
   - **Vocabulary:** instruct model to use **exact terms from the excerpt** (no synonym substitution for domain terms).

2. **Pass B — typed card generation** (per concept or **batched** 3–5 concepts per call to save rate limits)  
   One **prompt contract** per `type` (definition, misconception, …): front/back rules, reading level, banned openers, max length on back, JSON shape `{ front, back, difficulty, source_page? }`.

3. **Vocabulary policy** (system + Pass B; copy into prompts)  
   - Glossary-first: bold headings / “Definition:” patterns should yield **definition** cards where possible.  
   - Banned phrases on backs (e.g. “It is important to note”, “In this context”, …).  
   - **Difficulty:** 1 = recall fact; 2 = explain/apply; 3 = compare / edge case.

### 3.2 Validator (synchronous, no LLM)

Before insert/update from generation:

- Min/max lengths for `front` / `back`.  
- Reject `front === back`.  
- Banned vague **starters** on back (lowercase check).  
- **Question rule (soft):** prefer `?` on front for recall types; **exclude** strict failure for `cloze` or `definition` (see **COMPLETE_REFERENCE** validator).  
- Optional: max back **words** by tone preset.

### 3.3 Dedupe

- Within the same deck: fuzzy similarity on `front` (e.g. Levenshtein / `string-similarity`); threshold **TBD** (start ~0.82).

### 3.4 Tone presets (deck-level)

| Preset id | Intent | Prompt knobs (summary) |
|-----------|--------|-------------------------|
| `exam-crisp` | Terse, exam-style | Shorter backs; favor definition, cloze, procedure |
| `deep-understanding` | Why/how + examples | Longer backs; favor definition, contrast, misconception |
| `quick-recall` | One fact per card | Very short backs; favor definition, cloze |

Stored on `decks.tone_preset`; interpolated into Pass B + validator word limits.

---

## 4. LLM provider strategy ($0 preference)

**Default design:** pluggable **server-side** provider.

| Provider | Role | Notes |
|----------|------|--------|
| **Gemini 1.5 Flash** | Primary candidate for $0 | Verify current Google AI Studio terms & rate limits in your region. |
| **Groq** | Fast fallback | Free tier; may need tighter prompts + validator. |
| **Heuristic-only** | Emergency / demo offline | Glossary patterns only; document tradeoff. |
| **Claude / OpenAI** | Optional if credit available | Not assumed in “no pay” path. |

**Env:** one active key (e.g. `GEMINI_API_KEY` *or* `GROQ_API_KEY`) plus `LLM_PROVIDER` — see **COMPLETE_REFERENCE** §3 and `.env.example`.

---

## 5. PDF, chunks, and timeouts

- Extract text server-side (e.g. `pdf-parse`).  
- Chunk by page / character window with **overlap**—exact token target **TBD** (e.g. ~800 tokens equivalent in chars).  
- **Caps:** `MAX_CHUNKS`, `MAX_CARDS`, max upload MB—see **COMPLETE_REFERENCE** §7.  
- **Generation transport:** prefer **SSE** streaming so cards appear incrementally and a single monolithic 60s job is avoided where the platform allows—still subject to **host max duration**; if uploads are huge, degrade gracefully (cap chunks, message user).

**Redis / BullMQ:** not required for v1; **TBD** if you add background workers later.

---

## 6. Build phases (suggested order)

| Phase | Focus | Done when |
|-------|--------|-----------|
| **P0** | Repo scaffold, Supabase project, schema migrations, RLS basics, auth (or anonymous MVP **TBD**) | User can sign in or use session; tables exist |
| **P1** | PDF upload → storage → extract → chunk persist | End-to-end binary + text in DB |
| **P2** | Pass A + Pass B + validator + dedupe + SSE (or chunked HTTP) + tone | Cards from a real PDF look exam-prep–quality, not generic |
| **P3** | SM-2 engine + study queue API + study UI | Grading updates `next_review_at` correctly |
| **P4** | Deck list/detail, preview/edit cards, progress dashboard | Bad card edited stays fixed; due counts visible |
| **P5** | Deploy Vercel, env on host, README demo path | Public URL works |

---

## 7. What to determine before / during implementation

Resolved checklist items are in **`docs/COMPLETE_REFERENCE.md`**; **`docs/ARCHITECTURE.md` §12** lists only ship-time verification (quotas, `maxDuration`, Storage path helpers).

---

## 8. Submission artifacts (reminder)

1. Live URL  
2. 2–5 min video (upload → generate → edit → study → progress; mention two-pass + validator + provider tradeoff)  
3. Write-up: link `README.md`, this plan, architecture  
4. Public GitHub (no secrets in history)

---

## 9. Document map

| File | Purpose |
|------|---------|
| `README.md` | Quick intro, security, submission checklist |
| `docs/PLAN.md` | This file — product + quality + phases |
| `docs/PHASES.md` | **Phased tasks** (product + **security** per phase) |
| `docs/SECURITY.md` | **Security regulations** and pre-release checklist |
| `docs/COMPLETE_REFERENCE.md` | Full spec: enums, APIs, SM-2, prompts, validator, layout, deployment |
| `docs/ARCHITECTURE.md` | Overview ER / flow |
| `supabase/migrations/001_initial_schema.sql` | Canonical SQL |
| `.gitignore` | **Secret and local-only paths** that must not be committed |
| `.env.example` | Placeholder env names only |
