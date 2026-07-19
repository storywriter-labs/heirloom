# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Next.js version warning

This project uses **Next.js 16** (currently 16.2.5) with React 19. APIs, conventions, and file structure may differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Dev commands

```bash
npm run dev      # start dev server on localhost:3000
npm run build    # production build
npm run lint     # eslint
```

The Laravel backend must also be running on port 8000. It lives at:
`/Users/timbeckett/Code/laravel-demos/laravel-udemy-api`

```bash
# from the Laravel project root
php artisan serve   # starts on localhost:8000
php artisan config:clear   # run after changing config/services.php or .env
```

## Architecture

Heirloom is a life-story preservation app. Users create **subjects** (interviewees), add **sessions** (recorded conversations), and generate an AI **narrative** from the transcript.

### Two separate repos

- **This repo** — Next.js frontend, pure client-side SPA using the App Router
- **Laravel backend** at `/Users/timbeckett/Code/laravel-demos/laravel-udemy-api` — REST API under `/api/heirloom/v1/`, auth via Laravel Sanctum

### Data model (backend-authoritative)

```
Subject  (name, birth_year, places_lived, education_profession, family_structure, life_chapters, interests)
  └── Session  (title?, status: pending → transcribed → synthesised)
        └── Transcript  (transcript_text, source: manual | audio)
              └── Narrative  (narrative_text, format: memoir | letter | timeline, share_token)
```

### Auth

Login POSTs to `/api/auth/login`, receives a Sanctum bearer token, stored in `localStorage` as `auth_token`. All subsequent API calls go through `lib/api.ts → apiFetch()`, which reads the token and attaches it as `Authorization: Bearer`. Every page checks for the token in a `useEffect` and redirects to `/login` if absent.

### API layer

`lib/api.ts` exports a single `apiFetch(endpoint, options)` function. It prepends `NEXT_PUBLIC_API_URL` (set to `http://localhost:8000/api` in `.env.local`), attaches auth headers, and throws on any non-2xx response. Audio upload in the new-session page bypasses `apiFetch` and uses `fetch` directly (multipart form data requires no `Content-Type` header).

### Page structure

All pages are `'use client'` — there are no server components or server actions in use yet. The root `/` route is still the default Next.js template; the real entry point is `/login` → `/dashboard`.

| Route | Purpose |
|---|---|
| `/login` | Auth — token stored to localStorage |
| `/dashboard` | Lists all subjects with session counts |
| `/subjects/new` | Create subject with profile fields |
| `/subjects/[id]` | Subject profile + session list |
| `/subjects/[id]/sessions/new` | Create session (manual text or audio upload) |
| `/subjects/[id]/sessions/[sessionId]` | View transcript, generate and display narrative |

### Narrative generation

The session page POSTs to `/heirloom/v1/transcripts/{id}/narratives` with a `format` field. The Laravel `NarrativeService` calls Together AI (DeepSeek-V3.1) via `https://api.together.xyz/v1/chat/completions`. Config lives in `config/services.php` under the `together` key — **there must only be one `together` key in that file** or PHP will silently discard all but the last. The API key is `TOGETHER_API_KEY` in the Laravel `.env`.

### Session status gating

The transcript section on the session page only fetches and renders if `session.status === 'transcribed'`. The "Generate narrative" panel only renders if `transcript && !narrative`. Keep this status flow in mind when debugging missing UI sections.
