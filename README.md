# Paramedicus
Para (from Latin/Greek para, meaning "alongside," "beside," or "assistant") with medic (from Latin medicus, meaning "physician" or "doctor")

Paramedicus is a voice-first AI assistant for Ontario paramedics.

Core flow: **Talk -> auto-detect form -> fill live -> review -> generate PDF/XML -> preview email -> send**.

## Stack
- Backend: Express + WebSocket + OpenRouter + Puppeteer + Nodemailer
- Frontend: React (Vite) + Tailwind + Framer Motion
- Storage: In-memory sessions with JSON persistence

## Quick Start
```bash
# install
npm run install-all

# configure
cp .env.example .env
# add OPENROUTER_API_KEY

# run frontend + backend
npm run dev
```

Backend runs on `:42819`, frontend on `:53741`.

## Required Env
```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
OR_MODEL_FAST=google/gemini-2.5-flash
OR_MODEL_STRONG=google/gemini-2.5-flash
DEMO_MODE=true
PORT=42819
FRONTEND_URL=http://localhost:53741
DEFAULT_RECIPIENT=Team00@EffectiveAI.net
```

## Features
- Single-call AI pipeline through OpenRouter (`/api/v1/chat/completions`)
- Voice input/output using browser Web Speech + SpeechSynthesis
- Occurrence and Teddy Bear form auto-fill with confidence indicators
- Deterministic form validation (required, type checks, contradictions)
- PDF export for both forms, XML export for Teddy Bear
- Manual email preview gate before send
- `DEMO_MODE=true` simulates sends safely
- Shift schedule live scrape with cached fallback
- Status dashboard with BAD item highlights
- Weather query support via Open-Meteo (no key needed)
- Draft persistence in `server/data/drafts.json`

## Test
```bash
npm test
```

## Mock Data And Test Case Generation
Curated mock fixtures are stored in `mocks/mock-datasets.js` and validated by `tests/mock-datasets.test.js`.

Generate on-demand datasets and optional runnable test files:

```bash
# default generator (writes JSON + test file under mocks/generated)
npm run mock:generate

# custom run
node scripts/generate-mocks.js --count 12 --seed 20260304 --output mocks/generated --with-tests

# optional: generate only valid cases
node scripts/generate-mocks.js --count 20 --valid-only
```

If `--with-tests` is used, run the generated test file:

```bash
node --test mocks/generated/<generated-file>.test.js
```
