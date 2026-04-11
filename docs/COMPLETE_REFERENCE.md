# FlashGenius — Complete end-to-end reference

> Single specification for implementation: stack, env, schema, RLS, enums, APIs, SM-2, generation, validation, study/progress, file layout, security, build order, deployment, and write-up angles.  
> **Canonical SQL:** run [`../supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql) in the Supabase SQL editor (or Supabase CLI). It includes tables, triggers, RLS, and Storage policies.  
> **Relationship:** This document **resolves** the open “TBD” checklist in `ARCHITECTURE.md`; keep `PLAN.md` for narrative phases and `ARCHITECTURE.md` for a shorter ER/overview if you trim it later.

---

## Table of contents

1. [Product overview](#1-product-overview)  
2. [Technology stack](#2-technology-stack-all-choices-resolved)  
3. [Environment variables](#3-environment-variables)  
4. [Database schema](#4-database-schema-final-sql)  
5. [Row-level security](#5-row-level-security)  
6. [Data model relationships](#6-data-model-relationships)  
7. [Enums and constants](#7-enums-and-constants)  
8. [API surface](#8-api-surface)  
9. [SM-2 algorithm](#9-sm-2-algorithm-exact-implementation)  
10. [Two-pass generation pipeline](#10-two-pass-generation-pipeline)  
11. [Validator rules](#11-validator-rules-exact-logic)  
12. [Tone presets](#12-tone-presets-exact-prompt-knobs)  
13. [Vocabulary policy](#13-vocabulary-policy-system-prompt-text)  
14. [Study session logic](#14-study-session-logic)  
15. [Progress and mastery](#15-progress-and-mastery-model)  
16. [File and folder structure](#16-file-and-folder-structure)  
17. [Component data flow](#17-component-relationships-and-data-flow)  
18. [LLM provider abstraction](#18-llm-provider-abstraction)  
19. [Security rules](#19-security-rules-hard-requirements)  
20. [Build order](#20-build-order-day-by-day)  
21. [Deployment checklist](#21-deployment-checklist)  
22. [Write-up talking points](#22-write-up-talking-points)

---

## 1. Product overview

FlashGenius turns a PDF into a spaced-repetition deck. Upload → **SSE-streamed** generation → **preview and edit** → **SM-2** study → **progress** dashboard. Differentiators: **two-pass** generation, **typed** prompt contracts per card type, **synchronous validator**, **tone presets**, calm study UX.

**Core loop:** Upload PDF → generate cards (stream) → preview and edit → study (flip + grade) → SM-2 updates `next_review_at` → progress (mastery, due, streak).

---

## 2. Technology stack (all choices resolved)

| Layer | Choice | Reason |
|--------|--------|--------|
| Framework | Next.js 14 App Router | Vercel-native, RSC, Route Handlers |
| Language | TypeScript | Safety end-to-end |
| Styling | Tailwind CSS | Fast UI |
| Animation | Framer Motion | Flip and transitions |
| Database | Supabase (PostgreSQL) | Auth + Storage + DB, free tier |
| Auth | Supabase Auth (magic link + Google OAuth) | No extra auth service |
| Data access | Supabase JS client (+ SQL for aggregates) | Schema size fits without ORM |
| File storage | Supabase Storage | Same vendor |
| LLM (primary) | Google Gemini 1.5 Flash | Free tier via AI Studio (verify current terms) |
| LLM (fallback) | Groq `llama3-8b-8192` | Fast free tier; switch `LLM_PROVIDER` |
| PDF | `pdf-parse` | Server-side, no external API |
| Dedupe | `string-similarity` | Dice / bestMatch |
| Deploy | Vercel hobby | GitHub auto-deploy |

**Out of scope v1:** Redis, BullMQ, NextAuth, Prisma.

---

## 3. Environment variables

### 3.1 `.env.local` (never commit)

Use real values locally. Example shape:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key

NEXT_PUBLIC_APP_URL=http://localhost:3000

MAX_UPLOAD_MB=20
MAX_CHUNKS_PER_DECK=12
MAX_CARDS_PER_DECK=80
CHUNK_CHAR_TARGET=3200
CHUNK_OVERLAP_CHARS=400
GENERATION_CHUNK_BUDGET_MS=4500
DEDUPE_SIMILARITY_THRESHOLD=0.82
DAILY_NEW_CARD_LIMIT=20
MAX_REVIEW_SESSION_SIZE=50
```

### 3.2 `.env.example` (committed)

Placeholder names only — see repo root `.env.example`.

### 3.3 Vercel production

Same keys as `.env.local`. Mark `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY` as **server-only** (not exposed to Edge/client).

---

## 4. Database schema (final SQL)

**Run the canonical script:** [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql).

It creates:

- `public.profiles` (1:1 `auth.users`, auto-insert trigger on signup)  
- `public.decks` (`tone_preset`, `status`, `card_count`, storage path fields, timestamps)  
- `public.deck_chunks` (ordered text segments)  
- `public.cards` (`user_id` denormalized for RLS, `card_type`, SM-2 columns, `importance`, hints)  
- `public.review_events` (append-only log)  
- `updated_at` triggers on `decks`, `cards`  
- `sync_card_count` on insert/delete `cards`  
- RLS on all `public.*` tables  
- Storage bucket `pdfs` + RLS on `storage.objects` (path prefix = `auth.uid()`)

**Note:** Migration uses `security definer` + `search_path = public` on `handle_new_user` for safety.

---

## 5. Row-level security

Implemented in the **same** migration file as §4. Summary:

| Object | Rule idea |
|--------|-----------|
| `profiles` | `user_id = auth.uid()` |
| `decks` | `user_id = auth.uid()` |
| `deck_chunks` | parent `decks.user_id = auth.uid()` |
| `cards` | `user_id = auth.uid()` |
| `review_events` | `user_id = auth.uid()` |
| `storage.objects` (`pdfs`) | first folder segment of `name` equals `auth.uid()::text` |

---

## 6. Data model relationships

```
auth.users (Supabase)
  ├── 1:1  profiles
  ├── 1:N  decks
  │          ├── 1:N  deck_chunks
  │          └── 1:N  cards
  └── 1:N  review_events
```

**Query patterns**

- Due in deck: `cards` where `deck_id`, `user_id`, `next_review_at <= now()` order by `next_review_at`.  
- Due across decks: aggregate by `deck_id` with same filter.  
- Progress over time: `review_events` joined to `cards` filtered by `deck_id`.

---

## 7. Enums and constants

### DeckStatus

`draft` → `uploading` → `extracting` → `generating` → `ready` | `error` (`generation_error` set).

### CardType (front/back intent)

| `card_type` | Front | Back |
|-------------|-------|------|
| `definition` | “What is [term]?” / “Define [term]:” | 1–2 sentences + concrete example |
| `contrast` | Difference between X and Y | One line each + when to use which |
| `misconception` | Why wrong to say … | mistake + why fails + correct idea |
| `procedure` | When you see … first step? | ≤3 numbered steps |
| `cloze` | Sentence with `_____` | single unambiguous fill |

### Grade → SM-2 quality

| UI | Key | `sm2_quality` |
|----|-----|----------------|
| Again | `again` | 0 |
| Hard | `hard` | 2 |
| Good | `good` | 4 |
| Easy | `easy` | 5 |

Qualities 1 and 3 unused intentionally (four-button clarity).

### TonePreset

| id | max_back_words | Preferred types | Style |
|----|----------------|-----------------|--------|
| `exam-crisp` | 25 | definition, cloze, procedure | Terse exam Q / minimum answer |
| `deep-understanding` | 60 | definition, contrast, misconception | Why/how + analogy or example |
| `quick-recall` | 15 | definition, cloze | One fact, one line |

### Difficulty (card)

1 = recall stated fact; 2 = explain/apply; 3 = compare / edge / misconception.

### Importance (Pass A)

1 core; 2 supporting; 3 detail (include only if under `MAX_CARDS_PER_DECK`).

### Session defaults (env override)

| Constant | Default |
|----------|---------|
| `MAX_UPLOAD_MB` | 20 |
| `MAX_CHUNKS_PER_DECK` | 12 |
| `MAX_CARDS_PER_DECK` | 80 |
| `CHUNK_CHAR_TARGET` | 3200 |
| `CHUNK_OVERLAP_CHARS` | 400 |
| `GENERATION_CHUNK_BUDGET_MS` | 4500 |
| `DEDUPE_SIMILARITY_THRESHOLD` | 0.82 |
| `DAILY_NEW_CARD_LIMIT` | 20 |
| `MAX_REVIEW_SESSION_SIZE` | 50 |

---

## 8. API surface

All under `app/api/`. Auth: Supabase session cookie; middleware refreshes session.

### `POST /api/decks`

Body: `{ "title": string, "tone_preset": "exam-crisp" | ... }`  
Response `201`: `{ id, title, status, tone_preset }`.

### `POST /api/decks/[id]/upload`

Multipart field `file`. Validate `application/pdf`, size ≤ `MAX_UPLOAD_MB`.  
Store at `{user_id}/{deck_id}/{original_name}.pdf`. Status `uploading` → `extracting`.  
Response `200`: `{ chunks_created, pages, status }`. Errors `413`, `415`.

### `POST /api/decks/[id]/generate`

SSE `text/event-stream`. Events:

- `start` — `{ total_chunks }`  
- `card` — saved card row  
- `progress` — `{ chunk, total, cards_so_far }`  
- `done` — `{ total_cards, skipped_invalid, skipped_dupes }`  
- `error` — `{ message }`

### `GET /api/decks`

List decks + `due_count`, `new_count`, `card_count`, `last_studied_at`, etc.

### `GET /api/decks/[id]`

Deck + stats (`mature_count`, `learning_count`, `source_filename`, …).

### `GET /api/decks/[id]/cards?page=&limit=`

Paginated `{ cards, total, page, limit }`.

### `PATCH /api/cards/[id]`

Partial `{ front?, back?, difficulty? }`. Re-run validator; `400` + `{ errors }` if invalid.

### `DELETE /api/cards/[id]`

`204`.

### `GET /api/study/queue?deckId=&limit=`

Due first (`next_review_at <= now()`), then new (`next_review_at` null) capped by `DAILY_NEW_CARD_LIMIT`, ordered by `importance` asc, `created_at` asc for new.

### `POST /api/study/review`

Body `{ card_id, grade }` → SM-2 update, insert `review_events`, optionally bump `decks.last_studied_at` on session end.  
Response `{ next_review_at, interval_days, ease_factor }`.

### Auth callback

Use Supabase helper route under `app/(auth)/callback` or framework pattern — **not** necessarily `/api/auth/callback`; align with Supabase Next.js docs.

---

## 9. SM-2 algorithm (exact implementation)

```typescript
// lib/sm2.ts
export interface SM2State {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
}

export const GRADE_TO_QUALITY: Record<string, number> = {
  again: 0,
  hard: 2,
  good: 4,
  easy: 5,
};

export function sm2(state: SM2State, quality: number): SM2State {
  if (quality < 3) {
    return {
      ease_factor: Math.max(1.3, state.ease_factor - 0.2),
      interval_days: 1,
      repetitions: 0,
    };
  }

  const newEase = Math.max(
    1.3,
    state.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  let interval: number;
  if (state.repetitions === 0) {
    interval = 1;
  } else if (state.repetitions === 1) {
    interval = 6;
  } else {
    interval = Math.round(state.interval_days * newEase);
  }

  return {
    ease_factor: newEase,
    interval_days: interval,
    repetitions: state.repetitions + 1,
  };
}

export function nextReviewAt(intervalDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + intervalDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function leitnerBox(state: SM2State): 1 | 2 | 3 | 4 | 5 {
  if (state.repetitions === 0) return 1;
  if (state.interval_days <= 1) return 1;
  if (state.interval_days <= 4) return 2;
  if (state.interval_days <= 14) return 3;
  if (state.interval_days <= 60) return 4;
  return 5;
}

export function masteryBucket(state: SM2State): 'new' | 'learning' | 'mature' {
  if (state.repetitions === 0) return 'new';
  if (state.interval_days < 21) return 'learning';
  return 'mature';
}
```

**New cards:** `next_review_at` null, `repetitions = 0`. After first success (`q >= 3`), `repetitions` becomes 1 and interval 1 day; second success → 6 days — standard SM-2 ladder.

---

## 10. Two-pass generation pipeline

### Pass A (concept outline)

```typescript
export const PASS_A_PROMPT = (chunk: string, tonePreset: string) => `
You are a curriculum designer. Read the excerpt below and output a JSON array
of concepts worth testing. Use EXACT vocabulary from the excerpt — do not
substitute synonyms for domain terms.

For each concept:
- "concept": the term or idea (exact words from text)
- "type": one of ["definition","contrast","misconception","procedure","cloze"]
- "importance": 1 (core) | 2 (supporting) | 3 (detail)
- "source_hint": 4–8 words locating this in the text

Tone preset: ${tonePreset}
${tonePreset === 'exam-crisp' ? 'Prefer types: definition, cloze, procedure. Limit to importance 1–2 concepts.' : ''}
${tonePreset === 'deep-understanding' ? 'Prefer types: definition, contrast, misconception. Include importance 3 concepts.' : ''}
${tonePreset === 'quick-recall' ? 'Prefer types: definition, cloze. Limit to importance 1 concepts only.' : ''}

Excerpt:
"""
${chunk}
"""

Return ONLY valid JSON. No commentary, no markdown fences.
`;
```

### Pass B (per type)

Implement `PASS_B_PROMPTS` as `Record<CardType, (concept, preset) => string>` with full contracts for **definition**, **contrast**, **misconception**, **procedure**, and **cloze** (same rules as your original spec: exact term on front for definitions, numbered steps for procedure, single blank for cloze, misconception difficulty 2–3 only, `max_back_words` from `TONE_PRESETS[preset]`, JSON `{ front, back, difficulty, source_page }`). Keep prompts in `lib/generation/passB.ts` next to code for easy iteration.

### Batching

Batch **3–5** concepts per Pass B call; `sleep(1000)` between calls if needed for **15 RPM** class limits.

### JSON repair

Build a triple-backtick regex at runtime (use `\u0060` so this doc’s markdown fences stay valid):

```typescript
function safeParseJSON(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {}
  const fence = '\u0060'.repeat(3);
  const stripped = raw
    .replace(new RegExp(`^${fence}json\\n?|^${fence}\\n?|${fence}$`, 'gm'), '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {}
  const match = stripped.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {}
  }
  console.error('JSON parse failed:', raw.slice(0, 200));
  return null;
}
```

---

## 11. Validator rules (exact logic)

```typescript
// lib/generation/validator.ts
import stringSimilarity from 'string-similarity';

const VAGUE_OPENERS = [
  'it is important',
  'note that',
  'this refers to',
  'in this context',
  'something related to',
  'as mentioned',
  'as discussed',
  'basically',
  'this is a',
  'it should be noted',
  'please note',
];

const TONE_MAX_BACK_WORDS: Record<string, number> = {
  'exam-crisp': 25,
  'deep-understanding': 60,
  'quick-recall': 15,
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCard(card: RawCard, tonePreset: string): ValidationResult {
  const errors: string[] = [];
  const front = card.front?.trim() ?? '';
  const back = card.back?.trim() ?? '';

  if (!front || front.length < 10) errors.push('front too short (min 10 chars)');
  if (front.length > 300) errors.push('front too long (max 300 chars)');
  if (!back || back.length < 5) errors.push('back too short (min 5 chars)');

  const backWords = back.split(/\s+/).length;
  const maxWords = TONE_MAX_BACK_WORDS[tonePreset] ?? 60;
  if (backWords > maxWords) {
    errors.push(`back too long for tone preset (${backWords} words, max ${maxWords})`);
  }

  if (front.toLowerCase() === back.toLowerCase()) errors.push('front and back are identical');

  const lowerBack = back.toLowerCase();
  for (const opener of VAGUE_OPENERS) {
    if (lowerBack.startsWith(opener)) {
      errors.push(`back starts with vague phrase: "${opener}"`);
      break;
    }
  }

  if (card.card_type !== 'cloze' && card.card_type !== 'definition') {
    if (!front.includes('?')) errors.push('front should be phrased as a question');
  }

  return { valid: errors.length === 0, errors };
}

export function isDuplicate(card: RawCard, existing: RawCard[]): boolean {
  if (existing.length === 0) return false;
  const fronts = existing.map((c) => c.front.toLowerCase());
  const { bestMatch } = stringSimilarity.findBestMatch(card.front.toLowerCase(), fronts);
  const threshold = Number(process.env.DEDUPE_SIMILARITY_THRESHOLD) || 0.82;
  return bestMatch.rating > threshold;
}
```

---

## 12. Tone presets (exact prompt knobs)

```typescript
// lib/generation/tonePresets.ts
export const TONE_PRESETS = {
  'exam-crisp': {
    label: 'Exam crisp',
    description: 'Terse, direct exam-style questions and minimum correct answers.',
    max_back_words: 25,
    preferred_types: ['definition', 'cloze', 'procedure'] as const,
    pass_a_instruction: 'Limit to importance 1–2 concepts. Prefer definition, cloze, procedure types.',
    pass_b_style:
      'Terse. Front is a direct exam question. Back is the minimum correct answer. No examples unless essential.',
  },
  'deep-understanding': {
    label: 'Deep understanding',
    description: 'Why/how questions with analogies and examples.',
    max_back_words: 60,
    preferred_types: ['definition', 'contrast', 'misconception'] as const,
    pass_a_instruction: 'Include importance 3 concepts. Prefer definition, contrast, misconception types.',
    pass_b_style:
      'Conceptual. Front asks why or how. Back explains with an analogy or worked example.',
  },
  'quick-recall': {
    label: 'Quick recall',
    description: 'One fact per card, one-line answers.',
    max_back_words: 15,
    preferred_types: ['definition', 'cloze'] as const,
    pass_a_instruction: 'Limit to importance 1 concepts only. Prefer definition, cloze types.',
    pass_b_style: 'Snappy. One key fact per card. Back is one line maximum. No examples.',
  },
} as const;

export type TonePreset = keyof typeof TONE_PRESETS;
```

---

## 13. Vocabulary policy (system prompt text)

Insert into **every** Pass A / Pass B system envelope:

```
VOCABULARY POLICY — apply to every card without exception:
1. Domain terms: use the EXACT term from the source text. Never substitute a
   synonym (e.g. keep "photosynthesis", do not write "how plants make food").
2. Glossary-first: if the source text has bolded terms, section headings, or
   explicit "Definition:" patterns, those MUST appear as definition-type cards.
3. Banned phrases on the BACK of any card:
   "It is important to note" | "Note that" | "This refers to" |
   "In this context" | "Something related to" | "As mentioned above" |
   "As discussed" | "Basically" | "It should be noted"
4. Back length: 1–2 sentences for definition and cloze; 2–3 for misconception
   and procedure. Never write an essay.
5. Difficulty coding:
   1 = recall a directly stated fact
   2 = explain or apply a concept
   3 = compare, find edge cases, or identify misconceptions
6. Source fidelity: if you are uncertain about a detail, do not invent it.
   Omit that card rather than hallucinate.
```

---

## 14. Study session logic

### Server queue (`GET /api/study/queue`)

```typescript
const MAX_SESSION = Number(process.env.MAX_REVIEW_SESSION_SIZE) || 50;
const DAILY_NEW = Number(process.env.DAILY_NEW_CARD_LIMIT) || 20;

// 1) Due: next_review_at <= now(), oldest due first
// 2) New: next_review_at is null, order importance asc, created_at asc
// Concatenate: [...due, ...new] capped by MAX_SESSION
```

### Client state machine

`IDLE → SHOWING_FRONT → SHOWING_BACK → (grade) → NEXT_CARD → … → SESSION_COMPLETE`

### Session summary

Cards reviewed; count graded `sm2_quality >= 3`; streak (consecutive calendar days with ≥1 review); next earliest `next_review_at` in deck.

---

## 15. Progress and mastery model

| Bucket | Condition | UI |
|--------|-------------|-----|
| New | `repetitions === 0` | Gray |
| Learning | `repetitions > 0` and `interval_days < 21` | Amber |
| Mature | `interval_days >= 21` | Teal |

**Mastery %** ≈ `mature_count / card_count * 100` (ring on deck card).  
**Due** = `next_review_at <= now()`.  
**Streak** from `review_events` dates.

**Aggregate SQL (per deck)**

```sql
select
  count(*) filter (where next_review_at is null) as new_count,
  count(*) filter (where next_review_at is not null and interval_days < 21) as learning_count,
  count(*) filter (where interval_days >= 21) as mature_count,
  count(*) filter (where next_review_at <= now()) as due_count
from cards
where deck_id = $1 and user_id = $2;
```

---

## 16. File and folder structure

```
flashgenius/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (auth)/callback/route.ts
│   ├── (app)/layout.tsx
│   ├── (app)/page.tsx
│   ├── (app)/decks/page.tsx
│   ├── (app)/decks/new/page.tsx
│   ├── (app)/decks/[id]/page.tsx
│   ├── (app)/decks/[id]/study/page.tsx
│   ├── (app)/progress/page.tsx
│   └── api/decks/... , api/cards/... , api/study/...
├── components/{ui,decks,cards,study,progress}/...
├── lib/{supabase,generation,pdf,sm2,config}.ts
├── supabase/migrations/001_initial_schema.sql
├── docs/{PLAN,ARCHITECTURE,COMPLETE_REFERENCE}.md
├── .env.example
└── README.md
```

---

## 17. Component relationships and data flow

- **UploadZone** → `POST /api/decks` → `POST upload` → `POST generate` (SSE → live preview).  
- **DeckList** → `GET /api/decks` → **DeckCard** (due badge, mastery ring).  
- **Deck detail** → tabs Cards (`GET cards`, `PATCH`/`DELETE`) and Progress (stats).  
- **StudySession** → `GET study/queue` → **CardFlip** + **GradeButtons** → `POST study/review` → **SessionSummary**.

---

## 18. LLM provider abstraction

```typescript
// lib/generation/llm.ts
const provider = process.env.LLM_PROVIDER ?? 'gemini';

export async function callLLM(prompt: string, systemPrompt?: string): Promise<string> {
  if (provider === 'gemini') return callGemini(prompt, systemPrompt);
  if (provider === 'groq') return callGroq(prompt, systemPrompt);
  throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
}

async function callGemini(prompt: string, system?: string): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: system,
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function callGroq(prompt: string, system?: string): Promise<string> {
  const Groq = (await import('groq-sdk')).default;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    model: 'llama3-8b-8192',
    messages: [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
  });
  return completion.choices[0].message.content ?? '';
}
```

---

## 19. Security rules (hard requirements)

Operational policy, secret classification, Git rules, incident response, and an expanded checklist live in **[SECURITY.md](./SECURITY.md)**. Phased security work is in **[PHASES.md](./PHASES.md)**.

1. Never `NEXT_PUBLIC_*` for LLM or service role keys.  
2. All LLM calls only in server Route Handlers / Server Actions.  
3. RLS + anon key is OK **if** policies are correct.  
4. Validate PDF MIME + size on upload.  
5. Rate-limit `generate` (e.g. 3 / user / hour) — in-memory map or `decks` quota column for demo.  
6. Root **[`.gitignore`](../.gitignore)** excludes `.env`, `.env.*` (with `!.env.example`), keys, `.vercel`, and local Supabase state—**never commit** those paths.  
7. Migrations contain **no** secrets.

---

## 20. Build order (day by day)

| Day | Focus | Done when |
|-----|--------|------------|
| 1 | Next app, Supabase project, run migration, auth, empty deck list | Sign-in works |
| 2 | Upload, Storage, pdf-parse, chunks in DB | Chunks visible in Supabase |
| 3 | LLM adapter, Pass A/B, validator, SSE generate, tone selector | Streamed cards from real PDF |
| 4 | SM-2, queue + review APIs, Study UI, summary | `next_review_at` updates in DB |
| 5 | Deck detail edit/progress, polish, Vercel deploy, README, Loom | Public URL E2E |

---

## 21. Deployment checklist

- [ ] Public GitHub, `.env.local` gitignored  
- [ ] No keys in `git log`  
- [ ] Vercel envs set (server-only sensitive)  
- [ ] `NEXT_PUBLIC_APP_URL` = production URL  
- [ ] Supabase auth redirect URLs include production  
- [ ] Storage bucket private  
- [ ] Incognito test: sign up → upload → generate → study → progress  

---

## 22. Write-up talking points

- **Built:** PDF → two-pass AI deck + validator + dedupe + tone presets + SM-2 + edit + progress.  
- **Why two-pass:** concept map with types, then per-type contracts — reads teacher-written, not scraped.  
- **Why Gemini Flash:** free tier friendly; Groq fallback.  
- **Why SM-2 on card row:** fewer joins, simple RLS.  
- **Why SSE:** perceived latency + incremental value.  
- **Improvements:** async queue for huge PDFs, share links, PWA offline, embedding dedupe, Leitner UI.  
- **Challenges:** JSON fences (repair pipeline), serverless caps (`MAX_CHUNKS`), output variance (validator + types).
