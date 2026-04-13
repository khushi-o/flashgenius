# FlashGenius

> Your notes, reborn as cards. PDF or **.docx** in — spaced repetition out — so the exam does not get the last word, you do.

**Live:** https://flashgenius-three.vercel.app/  
**Code:** https://github.com/khushi-o/flashgenius

---

## The loop

1. **Drop a file** — syllabus slice, lab write-up, anything **PDF** or **Word .docx** (save old `.doc` as `.docx` first).
2. **Watch cards land** — generation streams in; you are not staring at a spinner pretending to think.
3. **Tweak what feels off** — fix a clumsy front or a lazy back before it joins the queue.
4. **Study like you mean it** — **SM-2** scheduling with Again / Hard / Good / Easy; the app picks what is due, not what is easy.
5. **Peek at the source** — book view by page, with optional AI summaries when you want takeaways, a memory hook, and a quick self-check.

---

## Why this is not “one prompt and pray”

Plenty of tools whisper sweet JSON and hand you fifty variants of “define this term.” FlashGenius splits the work:

- **Outline sweep** — pull structure from each chunk: terms, card shape (definition, contrast, misconception, procedure, cloze), and what matters most.
- **Card sweep** — separate contracts per card type: how the front should read, how tight the back stays, which fuzzy phrases get the boot, tone caps for *Exam crisp*, *Deep understanding*, and *Quick recall*.
- **Gate before save** — lengths, banned openers, sensible question shape where it counts, plus **Dice-style** fuzzy dedupe on fronts so near-twins do not flood the deck (default similarity bar **0.82**, all in-house code).

Same brain, three attitudes — those tone presets are just different dials on the same engine.

---

## Under the hood

| | |
|---|---|
| App | **Next.js 16** App Router, TypeScript, React 19 |
| Look | Tailwind CSS 4 |
| Data | Supabase — Postgres, Storage, Auth |
| Model | **Google Gemini** via `@google/generative-ai`; defaults favor **2.x** Flash ids (older `gemini-1.5-*` strings often 404 on newer keys — override with **`GEMINI_MODEL`** when you know what your key likes) |
| Text in | **pdf-parse** on the server for PDFs; **mammoth** for `.docx` |
| Ship | Vercel |

Keys for models and optional service work live **only on the server**. If it starts with `NEXT_PUBLIC_`, it is not for secrets.

---

## Run it locally

```bash
git clone https://github.com/khushi-o/flashgenius.git
cd flashgenius
npm install
cp .env.example .env.local
# Fill the blanks — .env.example is the field guide
npm run dev
```

### Supabase in five breaths

1. Spin up a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run, top to bottom:  
   `001_initial_schema.sql` → `002_storage_pdfs_update.sql` → `003_deck_pages.sql` (all under `supabase/migrations/`).
3. **Authentication → Providers** — turn on **Email** (magic link) and **Google** if you want both doors.
4. **Authentication → URL configuration** — `http://localhost:3000` as site URL for dev; add `http://localhost:3000/auth/callback` to redirect URLs, then repeat for production when you have a real domain.

Magic link login can ask **“What should we call you?”** — optional, friendly, and it lands in your profile after the redirect so the library can greet you properly.

### Env vars you actually need first

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
GEMINI_API_KEY=
```

Everything else — chunk caps, upload size, dedupe threshold, alternate models — is optional sugar; `.env.example` spells it out with comments.

---

## Ship to Vercel

1. Repo on GitHub, `.env.local` left at home.
2. Import in Vercel as a Next.js app.
3. Paste the same envs you use locally; keep model keys off the client.
4. Set **`NEXT_PUBLIC_APP_URL`** to the URL users type in the bar.
5. Mirror that URL plus `/auth/callback` in Supabase redirect settings.
6. Deploy and break a sweat on a real PDF.

**Heads-up:** default serverless request bodies are small. Big uploads need the right Vercel limits and/or a storage-first flow — read the notes in `.env.example` before you throw a textbook at it.

---

## Where things live

```
app/(app)/decks/     # library, builder, deck detail, reader
app/(app)/study/     # review session
app/(marketing)/login/
app/auth/callback/   # session exchange + display name sync
app/api/decks/       # upload, streamed generate, cards, page summaries
app/api/study/       # queue + review writes

components/          # UI
lib/generation/      # Gemini wrapper, sweeps, validator, types
lib/pdf/, lib/docx/  # extraction
lib/sm2.ts           # intervals
supabase/migrations/ # SQL, run in order
```

Hungry for diagrams, threat model notes, and a security checklist? That lives in **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)**.

---

## License

[MIT](./LICENSE). 
