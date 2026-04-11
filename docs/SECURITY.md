# FlashGenius — Security regulations and plan

This document defines **what must stay secret**, **how it is protected**, and **how we work** so the public repo and deployed app stay safe. It complements technical RLS and API rules in **[COMPLETE_REFERENCE.md](./COMPLETE_REFERENCE.md)** (§5, §19).

---

## 1. Scope and principles

| Principle | Meaning |
|-----------|---------|
| **Least privilege** | Users and processes only access their own decks, cards, PDFs, and reviews. |
| **Secrets off the client** | Nothing that can spend money, read all data, or impersonate the server ships to the browser. |
| **Defense in depth** | Git ignore + env discipline + RLS + upload validation + rate limits together—not one layer alone. |
| **Public repo safe by default** | A clone without `.env.local` must not reveal keys, tokens, or production credentials. |

---

## 2. Classified data (treat as confidential)

| Class | Examples | Where it may exist | Must never appear in |
|-------|----------|--------------------|------------------------|
| **Critical (Tier A)** | `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, production DB URLs with password, JWT signing secrets, OAuth client **secrets** | Server env only (Vercel “encrypted”, local `.env.local`) | Git, client bundles, `NEXT_PUBLIC_*`, screenshots, Loom, Discord |
| **Sensitive (Tier B)** | Refresh tokens, session cookies, user-uploaded PDFs | Browser cookies, Supabase Storage (private bucket), DB | Public URLs without auth; log files committed to repo |
| **Public by design (Tier C)** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | N/A—but **RLS must** enforce access (anon key is not a secret). |

**Rule:** If replacing a value with `REDACTED` would break prod or cost money, it is **Tier A** or **Tier B**.

---

## 3. Git and repository regulations

1. **Never commit** real `.env`, `.env.local`, `.env.production`, or any file containing Tier A/B values.  
2. **Only** `.env.example` may list variable **names** and fake placeholders; no real project URLs or keys.  
3. **Before every push**, run a quick secret scan (see §10). If a secret was committed, rotate the key and purge history (see §9).  
4. **Do not** commit: private keys (`.pem`, `.key`, `.pfx`), `service-account*.json`, `credentials.json`, downloaded Supabase **service role** dumps, Vercel token files.  
5. **Pull requests:** reject additions that introduce `NEXT_PUBLIC_*` for LLM keys or service role.  
6. **`.gitignore`** is mandatory and kept current—see root [`.gitignore`](../.gitignore). If you add a new tool that writes secrets locally, add its paths to `.gitignore` in the same commit.

---

## 4. Environment variable plan

| Variable class | Placement | Client exposure |
|----------------|-----------|-------------------|
| Supabase anon + URL | `NEXT_PUBLIC_*` | Yes—OK **only** with strict RLS. |
| Service role, LLM keys | Server-only env (no `NEXT_PUBLIC_`) | **Never.** |
| App URL | `NEXT_PUBLIC_APP_URL` | Yes—non-secret. |

**Local:** copy `.env.example` → `.env.local`. **Production:** set variables in Vercel dashboard; do not commit a production `.env` file.

**Rotation:** If any Tier A key leaks, rotate it in Supabase / Google / Groq / Vercel immediately and update env vars everywhere they are configured.

---

## 5. Application security plan

### 5.1 API and server code

- All LLM calls **only** in Route Handlers or server-only modules—never in `use client` trees without a server boundary.  
- Validate **PDF** MIME type (`application/pdf`) and **max size** before storage or parsing.  
- **Rate-limit** expensive routes (`/api/decks/[id]/generate`) per user or IP to limit abuse and quota burn.  
- Return **generic** errors to clients for generation failures; log details server-side only (no stack traces with env values in JSON responses).

### 5.2 Authentication and authorization

- Use **Supabase Auth** for identity; rely on **`auth.uid()`** in RLS for row access.  
- When using `SUPABASE_SERVICE_ROLE_KEY`, use it **only** in trusted server code and **never** forward user-controlled SQL. Prefer user-scoped Supabase client with JWT where possible.

### 5.3 Storage (PDFs)

- Bucket **`pdfs`** remains **private**.  
- Object path convention: `{user_id}/{deck_id}/...` with RLS policies enforcing first path segment = `auth.uid()`.  
- Do not generate **long-lived public URLs** for raw PDFs without explicit product need and access checks.

### 5.4 Dependencies

- Prefer `npm audit` / `pnpm audit` before release; patch high/critical issues.  
- Pin major versions for security-sensitive packages where practical.

---

## 6. Supabase-specific plan

1. **RLS enabled** on all `public` tables touched by the app (already in migration).  
2. **Storage RLS** on `storage.objects` for bucket `pdfs` (already in migration).  
3. **Auth redirect URLs** in Supabase dashboard must list **only** your real domains (localhost + production); remove stale URLs after demos.  
4. **Service role:** treat like root password; store in Vercel “Environment Variables” as sensitive; rotate if exposed.

---

## 7. Deployment (Vercel)

- Mark sensitive env vars as **encrypted / not exposed to client** in Vercel UI.  
- Do not enable “Expose” for Tier A variables.  
- Use **Preview** deployments with **preview-specific** Supabase redirect URLs or a dedicated test project if you fear URL leakage during review.

---

## 8. Incident response (leaked secret)

1. **Revoke / rotate** the leaked credential at the provider (Supabase, Google AI, Groq, etc.).  
2. **Update** Vercel and local `.env.local` with new values.  
3. If committed to git: **`git filter-repo`** or BFG to remove the file from history, then **force-push** only if you control the repo and team agrees—or rotate keys and accept old commits still contain ciphertext (rotation is mandatory either way).  
4. Document what happened in a private note (not in public README).

---

## 9. Pre-release security checklist

- [ ] No Tier A strings in `git grep -i "AIza\|sk-\|gsk_\|service_role" -- .` (adjust patterns for your keys).  
- [ ] `.env.local` and `.env` are gitignored and not staged (`git status` clean of secrets).  
- [ ] `NEXT_PUBLIC_*` keys reviewed—no LLM or service role.  
- [ ] RLS smoke test: second user cannot read first user’s deck/cards/PDF.  
- [ ] Upload rejects non-PDF and oversize files.  
- [ ] Production Supabase redirect URLs correct.  
- [ ] Loom / submission video shows no `.env.local` or key material.

---

## 10. Ongoing responsibilities

| When | Action |
|------|--------|
| New env var added | Update `.env.example` (name only) and this doc’s §4 table if classification changes. |
| New API route | Confirm auth + ownership checks; no secret in response body. |
| New storage bucket | Default private + RLS before any upload code ships. |
| Dependency major bump | Re-read changelog for breaking security behavior. |

---

## 11. Related documents

| Document | Role |
|----------|------|
| [COMPLETE_REFERENCE.md](./COMPLETE_REFERENCE.md) | API security rules, RLS summary, deployment checklist |
| [PHASES.md](./PHASES.md) | Phased work including **security tasks per phase** |
| [../.gitignore](../.gitignore) | Files and patterns that must not be committed |
| [../.env.example](../.env.example) | Safe env template |
