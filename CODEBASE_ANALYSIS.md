
# ParaHelper (Medicos) — Complete Codebase Analysis

> **Project:** ParaHelper (internally "Paramedicus" / "MedicOS")
> **Purpose:** Voice-first AI assistant for Ontario paramedics — automating form filling, email delivery, shift schedules, and status reports
> **Context:** Built for the Centennial College × EffectiveAI Inc. hackathon (March 2–4, 2026)
> **Team:** 07 | Target email: Team07@EffectiveAI.net

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Directory Structure](#4-directory-structure)
5. [Server Deep Dive](#5-server-deep-dive)
   - 5.1 Entry Point & Configuration
   - 5.2 AI Pipeline
   - 5.3 WebSocket Layer
   - 5.4 REST API Surface
   - 5.5 Services Layer
   - 5.6 Forms System
   - 5.7 Data Layer
6. [Client Deep Dive](#6-client-deep-dive)
   - 6.1 Entry Points & App Shell
   - 6.2 Component Tree
   - 6.3 Custom Hooks
   - 6.4 Utilities & Constants
   - 6.5 Styling & Animations
   - 6.6 User Flow
7. [Real-Time Communication Protocol](#7-real-time-communication-protocol)
8. [Data Models & Persistence](#8-data-models--persistence)
9. [Testing & Mock Infrastructure](#9-testing--mock-infrastructure)
10. [External Integrations](#10-external-integrations)
11. [Hackathon Challenge Alignment](#11-hackathon-challenge-alignment)
12. [Key Design Decisions](#12-key-design-decisions)
13. [Unused / Dead Code](#13-unused--dead-code)
14. [Potential Improvements](#14-potential-improvements)

---

## 1. Executive Summary

ParaHelper is a **monorepo web application** that serves as an AI-powered assistant for Ontario paramedics. Its primary job is to eliminate administrative burden by letting paramedics **speak naturally** about incidents, and having the AI **automatically extract structured data** to fill out regulatory forms.

**Core workflow:**
```
Talk → AI detects form intent → Fields auto-populate → Paramedic reviews
→ PDF/XML generated → Email previewed → Sent to dispatch
```

The application supports **four key capabilities** aligned with the hackathon challenge:

| Capability | Implementation |
|------------|---------------|
| Occurrence Report | Full form with 24 fields, PDF export, email delivery |
| Teddy Bear Tracking | 11-field form with PDF + XML export |
| Shift Schedule Q&A | Web scraping of EffectiveAI.net + conversational queries |
| Paramedic Status Report | Bundled compliance checklist with personalized Q&A |

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT (React SPA)                          │
│  Port 53741 · Vite · Tailwind · Framer Motion · Web Speech API     │
│                                                                      │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ ChatPanel│  │FormPreview│  │ ShiftView │  │StatusDashboard   │  │
│  │ + Voice  │  │ + Fields  │  │ + Search  │  │ + Compliance     │  │
│  └────┬─────┘  └─────┬─────┘  └─────┬─────┘  └───────┬──────────┘  │
│       │              │              │                │              │
│       └──────────────┴──────────────┴────────────────┘              │
│                          │ WebSocket + REST                         │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────────┐
│                      SERVER (Express + WS)                          │
│  Port 42819 · Node.js ESM · In-memory sessions                     │
│                                                                      │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────────┐  │
│  │ Routes  │  │    AI    │  │ Services │  │       Forms         │  │
│  │ (REST)  │  │ Pipeline │  │  Layer   │  │  Schemas/Validate   │  │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └──────────┬──────────┘  │
│       │            │             │                   │              │
│       │       ┌────┴─────┐  ┌────┴────────────┐     │              │
│       │       │OpenRouter│  │ PDF · XML · Email│     │              │
│       │       │ / Gemini │  │ Weather · Scraper│     │              │
│       │       └──────────┘  └─────────────────┘     │              │
│       └──────────────────────────────────────────────┘              │
│                          │ File I/O                                  │
│                    ┌─────┴──────┐                                    │
│                    │ data/      │                                    │
│                    │ drafts.json│                                    │
│                    │ artifacts/ │                                    │
│                    └────────────┘                                    │
└──────────────────────────────────────────────────────────────────────┘
                           │
               ┌───────────┴───────────┐
               │   External Services   │
               │ • OpenRouter / Gemini │
               │ • Open-Meteo Weather  │
               │ • EffectiveAI.net     │
               │ • Resend SMTP         │
               │ • Deepgram (optional) │
               └───────────────────────┘
```

**Communication patterns:**
- **WebSocket** (`/ws`): Primary channel for chat messages, form updates, and real-time typing indicators
- **REST API** (`/api/*`): Used for form export, email preview/send, schedule, status, and voice endpoints
- **localStorage**: Client-side session persistence (profile, preferences, session history)
- **JSON file**: Server-side session persistence (`drafts.json`)

---

## 3. Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | ESM (type: module) | Runtime |
| Express | ^4.21.0 | HTTP framework |
| ws | ^8.18.0 | WebSocket server |
| dotenv | ^16.4.0 | Environment variables |
| Zod | ^3.23.0 | Schema validation |
| Puppeteer | ^23.0.0 | PDF generation via headless Chrome |
| xml2js | ^0.6.0 | XML building (Teddy Bear form) |
| Nodemailer | ^6.9.0 | Email sending (SMTP/Resend) |
| Cheerio | ^1.0.0 | HTML parsing for schedule scraping |
| uuid | ^10.0.0 | Session ID generation |
| cors | ^2.8.0 | Cross-origin support |
| concurrently | ^9.0.0 | Dev script orchestration |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^18.3.0 | UI framework |
| Vite | ^5.4.0 | Build tool & dev server |
| Tailwind CSS | ^3.4.0 | Utility-first styling |
| Framer Motion | ^11.0.0 | Animations & transitions |
| Lucide React | ^0.400.0 | Icon library |
| PostCSS | ^8.4.0 | CSS processing |
| Autoprefixer | ^10.4.0 | CSS vendor prefixes |

### External APIs

| Service | Key Required? | Purpose |
|---------|--------------|---------|
| OpenRouter | Yes | LLM gateway (routes to Gemini) |
| Google Gemini | Yes (alt) | Direct LLM access |
| Open-Meteo | No | Weather data (free, no key) |
| OpenWeatherMap | Optional | Premium weather (if key provided) |
| Deepgram | Optional | Server-side STT/TTS |
| Resend | Optional | Email delivery via SMTP |
| EffectiveAI.net | No | Schedule scraping |

---

## 4. Directory Structure

```
medicos/
│
├── package.json                 # Root: server deps + monorepo scripts
├── package-lock.json
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Template for required env vars
├── .gitignore
├── README.md                    # Project overview & setup guide
├── DECISIONS.md                 # Architecture decision record
├── Hackathon Challenge Outline V07.pdf
│
├── server/                      # ── BACKEND ──────────────────────
│   ├── index.js                 # Entry: Express + WebSocket bootstrap
│   ├── config.js                # Environment config loader
│   │
│   ├── ai/                      # AI/LLM Layer
│   │   ├── openrouter.js        # LLM API client (OpenRouter + Gemini)
│   │   ├── pipeline.js          # Main conversation pipeline
│   │   └── prompts.js           # System & user prompt builders
│   │
│   ├── ws/                      # WebSocket Layer
│   │   └── handler.js           # Message type router
│   │
│   ├── routes/                  # REST API Layer
│   │   ├── chat.js              # POST /api/chat/turn
│   │   ├── forms.js             # GET/POST /api/forms/*
│   │   ├── email.js             # POST /api/email/*
│   │   ├── schedule.js          # GET /api/schedule
│   │   ├── status.js            # GET /api/status
│   │   └── voice.js             # POST /api/voice/*
│   │
│   ├── services/                # Business Logic Layer
│   │   ├── session.js           # Session manager (in-memory + JSON)
│   │   ├── pdf.js               # Puppeteer PDF generation
│   │   ├── xml.js               # Teddy Bear XML builder
│   │   ├── email.js             # Nodemailer email sender
│   │   ├── weather.js           # Weather API client
│   │   ├── scraper.js           # Schedule web scraper
│   │   └── stt.js               # Deepgram STT/TTS client
│   │
│   ├── forms/                   # Form Definition Layer
│   │   ├── schemas.js           # Form field definitions + Zod schemas
│   │   ├── validation.js        # Domain validation rules
│   │   └── templates.js         # HTML templates for PDF/email
│   │
│   └── data/                    # Persistence Layer
│       ├── drafts.json          # Persisted sessions (gitignored)
│       ├── status-data.json     # Paramedic compliance data
│       ├── schedule-fallback.json  # Fallback when scrape fails
│       └── artifacts/           # Generated PDFs and XMLs
│           └── .gitkeep
│
├── client/                      # ── FRONTEND ─────────────────────
│   ├── package.json             # Client dependencies
│   ├── package-lock.json
│   ├── .env                     # VITE_API_BASE
│   ├── index.html               # HTML shell (fonts, #root)
│   ├── vite.config.js           # Vite config (port 53741)
│   ├── tailwind.config.js       # Tailwind theme + animations
│   ├── postcss.config.js        # PostCSS plugins
│   │
│   └── src/
│       ├── main.jsx             # React entry point
│       ├── App.jsx              # Root component (state hub)
│       ├── App.css              # Component-specific animations
│       ├── index.css            # Global styles + CSS variables
│       │
│       ├── components/          # UI Components
│       │   ├── WelcomeScreen.jsx    # Profile setup / onboarding
│       │   ├── Layout.jsx           # App shell (header + 2-col)
│       │   ├── ChatPanel.jsx        # Chat messages + input
│       │   ├── MessageBubble.jsx    # Single chat message
│       │   ├── VoiceButton.jsx      # Mic button + visualizer
│       │   ├── LoadingDots.jsx      # Typing indicator
│       │   ├── FormPreview.jsx      # Active form display
│       │   ├── FormField.jsx        # Individual form field
│       │   ├── ShiftView.jsx        # Schedule table
│       │   ├── StatusDashboard.jsx  # Compliance dashboard
│       │   ├── EmailPreview.jsx     # Email send modal
│       │   ├── FormPanel.jsx        # (unused) Alt form panel
│       │   ├── ProfileSetup.jsx     # (unused) Alt profile form
│       │   ├── ScheduleView.jsx     # (unused) Alt schedule view
│       │   ├── StatusView.jsx       # (unused) Alt status view
│       │   └── EmailPreviewModal.jsx# (unused) Alt email modal
│       │
│       ├── hooks/               # Custom React Hooks
│       │   ├── useSession.js        # Session + localStorage
│       │   ├── useWebSocket.js      # WS connect + reconnect
│       │   └── useVoice.js          # Web Speech API + TTS
│       │
│       └── utils/               # Shared Utilities
│           ├── api.js               # REST API client functions
│           └── constants.js         # API_BASE, enums, labels
│
├── tests/                       # ── TESTS ────────────────────────
│   ├── schemas.test.js              # Zod schema validation
│   ├── validation.test.js           # Form validation rules
│   ├── xml-generation.test.js       # XML builder output
│   └── mock-datasets.test.js        # Curated mock validation
│
├── mocks/                       # ── MOCK DATA ────────────────────
│   ├── mock-datasets.js             # Curated test fixtures
│   └── generated/
│       ├── mock-suite-seed-*.json   # Generated form cases
│       └── mock-suite-seed-*.test.js# Auto-generated tests
│
└── scripts/                     # ── SCRIPTS ──────────────────────
    └── generate-mocks.js            # Deterministic mock generator
```

---

## 5. Server Deep Dive

### 5.1 Entry Point & Configuration

**`server/index.js`** — The application entry point:
- Ensures the `data/artifacts/` directory exists
- Restores persisted sessions from `drafts.json`
- Creates an Express app with CORS (allowing the frontend origin) and JSON body parsing (10 MB limit)
- Mounts all route modules under `/api/`
- Serves generated artifacts as static files at `/api/artifacts/`
- Creates an HTTP server and attaches a WebSocket server at path `/ws`
- On WebSocket connection: reads or creates a session from the `?session=` query param, sends `session_init`, then delegates all messages to `handleWSMessage`
- Persists sessions to disk every 30 seconds via `setInterval`
- Listens on the configured port (default 42819)

**`server/config.js`** — Configuration loader:
- Uses `dotenv` to load `.env` from the project root
- Requires at least one of `OPENROUTER_API_KEY` or `GOOGLE_API_KEY`
- Determines `LLM_PROVIDER` ("openrouter" or "google") based on which key is present
- Exports a flat `config` object with all environment values and sensible defaults
- Logs warnings for missing optional keys (Deepgram, ElevenLabs, OpenWeather, Resend)

### 5.2 AI Pipeline

This is the brain of the application — three files that handle everything from prompt construction to LLM communication.

**`server/ai/prompts.js`** — Prompt Engineering:
- `buildSystemPrompt(session)` constructs a detailed system prompt that tells the LLM to act as "ParaHelper", an Ontario paramedic assistant
- The system prompt includes:
  - The paramedic's profile (name, medic number, badge, role, service, vehicle)
  - Currently active form schemas with field definitions and required markers
  - Task instructions: transcript cleanup, intent classification, field extraction, validation, response generation, and suggested actions
  - Output format specification (JSON with defined keys)
- `buildUserPrompt(userInput, session)` appends current form state to the user's raw input so the LLM has context about what's already been filled

**`server/ai/openrouter.js`** — LLM Client:
- Supports two providers: **OpenRouter** (proxied Gemini) and **Google Gemini** (direct)
- `callLLM(messages, options)` is the main entry point
  - Options: `model`, `temperature` (default 0.3), `maxTokens` (default 2048), `retries` (default 2), `timeoutMs` (default 30s)
  - Sends messages in the appropriate format for the chosen provider
  - Parses JSON from the response, stripping markdown code fences if present
  - Retries on JSON parse failure (appends a "please return valid JSON" message)
  - Falls back to a safe text-only response object on final failure
- Helper functions: `stripJSONFences`, `normalizeGeminiModel`, `toGeminiPayload`, `requestOpenRouter`, `requestGemini`, `fallbackText`

**`server/ai/pipeline.js`** — Conversation Pipeline:
- `runPipeline(session, userInput)` is the main function called for every user message
- **Pipeline steps:**
  1. **Context gathering** — Loads schedule data, weather data, and status data based on keyword detection in the user's input
  2. **Prompt building** — Constructs system + user prompts with all context
  3. **LLM call** — Sends to the configured model
  4. **Response normalization** — Converts snake_case, applies defaults for missing fields
  5. **Profile auto-fill** — Injects date/time and profile data into form fields
  6. **Return** — Returns structured result with intent, form updates, response text, suggested actions
- `localFallbackPipeline(session, userInput, context)` — Rule-based fallback when the LLM is unavailable or fails:
  - Keyword-matches user input against schedule, status, weather, teddybear, and occurrence patterns
  - Returns appropriate responses with pre-formatted data
  - Ensures the app remains functional without LLM connectivity
- `getStatusData()` — Loads and caches `status-data.json`

**Pipeline output shape:**
```
{
  cleanedText       — Cleaned version of user input
  intent            — "fill_form" | "status_query" | "shift_query" | "general" | ...
  intentConfidence  — "high" | "medium" | "low"
  formType          — "occurrence" | "teddybear" | null
  formUpdates       — { fieldKey: value, ... }
  fieldConfidence   — { fieldKey: "high"/"medium"/"low", ... }
  validationWarnings— ["warning message", ...]
  responseText      — Natural language response to the user
  followupQuestion  — Next question to ask (if any)
  suggestedActions  — ["action label", ...]
  missingRequired   — ["field_key", ...]
}
```

### 5.3 WebSocket Layer

**`server/ws/handler.js`** — Message Router:

| Client Message Type | Server Response | Behavior |
|--------------------|--------------------|----------|
| `user_message` | `typing` → `assistant_message` | Runs AI pipeline, updates form state, returns full result |
| `update_profile` | `profile_updated` | Merges partial profile into session |
| `update_form_field` | `form_updated` | Updates a single field, runs validation, returns updated form state |
| `request_form_review` | `form_review` | Returns full form data with validation for review |
| `set_current_form` | `current_form_set` | Switches the active form type |
| `ping` | `pong` | Keep-alive with timestamp |

Error handling: Invalid JSON triggers an `error` message. Pipeline failures fall back to a friendly error message sent as `assistant_message`.

### 5.4 REST API Surface

| Method | Endpoint | Purpose | Key Parameters |
|--------|----------|---------|----------------|
| `GET` | `/api/health` | Health check with feature flags | — |
| `POST` | `/api/chat/turn` | Synchronous chat turn | `sessionId`, `text`, `source?` |
| `GET` | `/api/forms` | List all forms for a session | `sessionId` (header/query) |
| `GET` | `/api/forms/:formType` | Get form schema + current values | `sessionId` |
| `POST` | `/api/forms/:formType/field` | Update a single field | `sessionId`, `field`, `value` |
| `POST` | `/api/forms/:formType/review` | Get form review with validation | `sessionId` |
| `POST` | `/api/forms/:formType/export` | Export to PDF (+ XML for teddybear) | `sessionId` |
| `POST` | `/api/email/preview` | Build email preview | `sessionId`, `formType?`, `to?` |
| `POST` | `/api/email/send` | Send form via email | `sessionId`, `formType?`, `to?` |
| `GET` | `/api/schedule` | Get schedule data | — |
| `GET` | `/api/status` | Get compliance status | `medicNumber?` |
| `POST` | `/api/voice/transcribe` | Speech-to-text (Deepgram) | `audioBase64`, `mimeType?` |
| `POST` | `/api/voice/tts` | Text-to-speech (Deepgram) | `text`, `model?` |
| `GET` | `/api/artifacts/*` | Static file serving for PDFs/XMLs | — |

### 5.5 Services Layer

**Session Manager** (`services/session.js`):
- In-memory store backed by JSON file persistence (`drafts.json`)
- Each session contains: profile, messages (capped at 40), active forms, form history, and artifacts
- Auto-persists on a 30-second interval
- Restores sessions on server restart
- Methods: `create`, `get`, `has`, `updateProfile`, `addMessage`, `updateForm`, `getForm`, `completeForm`, `setCurrentForm`, `addArtifact`, `serialize`, `persist`, `restore`

**PDF Generator** (`services/pdf.js`):
- Primary: Uses Puppeteer to render HTML templates into PDF buffers
- Fallback: If Puppeteer fails (e.g., no Chrome installed), generates a minimal raw PDF with the HTML content as text
- `generateAndSavePDF()` saves to `data/artifacts/` and returns file metadata

**XML Builder** (`services/xml.js`):
- Builds structured XML for Teddy Bear tracking forms using `xml2js.Builder`
- XML structure: `<TeddyBearTracking version="1.0">` with `<Meta>`, `<Distribution>`, `<PrimaryMedic>`, optional `<SecondMedic>`, optional `<Recipient>`
- `saveXMLArtifact()` saves to `data/artifacts/`

**Email Service** (`services/email.js`):
- `buildEmailPreview()` constructs a preview object with to, subject, HTML body, and attachment filenames
- `sendFormEmail()` sends via SMTP (Nodemailer) with PDF and XML attachments
- In `DEMO_MODE`, emails are only logged to console (not sent)

**Weather Service** (`services/weather.js`):
- Primary: OpenWeatherMap API (if key provided)
- Fallback: Open-Meteo API (free, no key required)
- Returns: `{ source, location, temperatureC, windKph, condition, ... }`
- Default location: Toronto, Ontario

**Schedule Scraper** (`services/scraper.js`):
- Scrapes `www.effectiveai.net` homepage for schedule links
- Follows links and parses HTML tables using Cheerio
- 5-minute cache to avoid excessive requests
- Falls back to `schedule-fallback.json` on any scraping failure
- Returns: `{ source, fetchedAt, links, tables, text }`

**STT/TTS Service** (`services/stt.js`):
- Deepgram integration for server-side speech processing
- `transcribeWithDeepgram()` — Uses `nova-2-medical` model, returns transcript + confidence
- `speakWithDeepgram()` — Text-to-speech, returns audio buffer
- Only available when `DEEPGRAM_API_KEY` is configured

### 5.6 Forms System

**Schemas** (`forms/schemas.js`):

Two form types are fully defined:

**Occurrence Report** — 24 fields across 5 sections:

| Section | Fields |
|---------|--------|
| Incident Overview | `date`*, `time`*, `location`, `classification`* (select: Non-Urgent/Urgent/Emergency), `occurrence_type`* (select: Vehicle Damage/Equipment Failure/...) |
| Service & Vehicle | `service`* (select), `vehicle_number`* |
| Personnel | `role`* (select: PCP/ACP/...), `badge_number`*, `partner_name`, `partner_badge` |
| Report Details | `brief_description`*, `observation`*, `requested_by`*, `action_taken`, `notification`, `follow_up` |
| Submission | `report_creator`*, `supervisor_name`, `supervisor_notified` (bool), `additional_notes` |

(* = required)

**Teddy Bear Tracking** — 11 fields across 4 sections:

| Section | Fields |
|---------|--------|
| Date & Time | `date_time`* (datetime-local) |
| Primary Medic | `first_name`*, `last_name`*, `medic_number`* |
| Second Medic | `second_medic_first`, `second_medic_last`, `second_medic_number` |
| Recipient | `recipient_first`, `recipient_last`, `recipient_age` (number), `recipient_type` (select: Patient/Family/Bystander/Other) |

Each field definition includes: `label`, `type` (text/select/textarea/boolean/date/time/datetime-local/number), `required`, `section`, and optionally `options` for selects.

Both forms also have corresponding **Zod schemas** for structural validation.

**Validation** (`forms/validation.js`):
- `validateForm(formType, formData, schema, fieldConfidence)` returns:
  - `errors[]` — blocking issues (missing required fields, invalid formats)
  - `warnings[]` — non-blocking concerns (unusual values, low confidence)
  - `zodIssues[]` — Zod schema violations
  - `canExport` — boolean, true only if zero errors
  - `completion` — object with `filled`, `required`, `total`, `percentage`
- Domain-specific rules:
  - `vehicle_number` must be 4 digits
  - `medic_number` / `second_medic_number` must be 5 digits
  - `recipient_age` must be 0–120
  - Low-confidence fields generate warnings

**Templates** (`forms/templates.js`):
- `buildOccurrencePDFHTML(formData, profile)` — Full HTML document for occurrence report PDF with professional styling (headers, tables, sections)
- `buildTeddyBearPDFHTML(formData, profile)` — Full HTML document for Teddy Bear form PDF
- `buildEmailHTML({ formType, formName, formData, profile, validation })` — Email body HTML with completion summary and field table
- `applyTemplateValues(template, values)` — Simple `{key}` placeholder replacement

### 5.7 Data Layer

| File | Purpose | Shape |
|------|---------|-------|
| `data/drafts.json` | Persisted sessions | `{ updatedAt, sessions: [Session, ...] }` |
| `data/status-data.json` | Paramedic compliance checklist | `{ summary, items[], referenceGuide, criticalActions[] }` |
| `data/schedule-fallback.json` | Fallback schedule when scraping fails | `{ source, tables[], text }` |
| `data/artifacts/*.pdf` | Generated PDF reports | Binary PDF files |
| `data/artifacts/*.xml` | Generated Teddy Bear XML | XML documents |

**Status data items** (11 compliance codes):

| Code | Type | Description |
|------|------|-------------|
| ACRc | ACR Completion | Unfinished ambulance call reports (24h deadline) |
| ACEr | ACE Response | ACE reviews needing comment (1-week deadline) |
| CERT-DL | Drivers License | License validity |
| CERT-Va | Vaccinations | Required vaccinations up to date |
| CERT-CE | Education | Continuous education status |
| UNIF | Uniform | Uniform order credits |
| CRIM | CRC | Criminal record check |
| ACP | ACP Status | Advanced Care Paramedic certification |
| VAC | Vacation | Vacation requested and approved |
| MEALS | Missed Meals | Missed meal claims |
| OVER | Overtime Req. | Outstanding overtime requests |

---

## 6. Client Deep Dive

### 6.1 Entry Points & App Shell

**`index.html`** — Loads Google Fonts (DM Sans for body text, JetBrains Mono for monospace), provides the `#root` mount point.

**`main.jsx`** — Standard React 18 entry: renders `<App />` into `#root`, imports global CSS.

**`App.jsx`** — The root component and state orchestrator. Manages:
- **15+ state variables** covering messages, forms, voice, panels, schedule, status, and email
- **3 custom hooks**: `useSession`, `useWebSocket`, `useVoice`
- **WebSocket event handling**: Processes all incoming WS messages and updates relevant state
- **API integration**: Calls REST endpoints for schedule, status, email preview, and email send
- **Conditional rendering**: Shows `WelcomeScreen` if no profile, otherwise `Layout` with panels

### 6.2 Component Tree

```
App
├── WelcomeScreen                  (when no profile)
│   └── Profile form → onStart()
│
└── Layout                         (when profile exists)
    ├── Header
    │   ├── App title ("MedicOS")
    │   ├── Session selector dropdown
    │   ├── New Chat button
    │   ├── Remember toggle
    │   ├── Voice selector
    │   ├── TTS toggle
    │   └── Profile display
    │
    ├── Left Panel: ChatPanel
    │   ├── Connection status banner
    │   ├── Message list
    │   │   └── MessageBubble (per message)
    │   │       ├── Content text
    │   │       ├── FieldPills (form updates)
    │   │       └── SourceTag (voice/typed)
    │   ├── LoadingDots (when typing)
    │   ├── Interim transcript display
    │   ├── Text input + Send button
    │   ├── VoiceButton
    │   │   ├── Mic/Volume icon
    │   │   ├── Bar visualizer
    │   │   └── State label
    │   └── Suggested action buttons
    │
    ├── Right Panel (switches by panelMode)
    │   ├── FormPreview              (panelMode === 'form')
    │   │   ├── Form header + completion bar
    │   │   ├── Validation errors/warnings
    │   │   ├── Sections with FormField components
    │   │   │   └── FormField
    │   │   │       ├── Label + confidence dot
    │   │   │       ├── Input (text/select/textarea/bool/date/time/number)
    │   │   │       └── Flash animation on update
    │   │   └── Review & Send button
    │   │
    │   ├── ShiftView                (panelMode === 'schedule')
    │   │   ├── Search input
    │   │   ├── Status filter buttons
    │   │   └── Schedule table with status badges
    │   │
    │   └── StatusDashboard          (panelMode === 'status')
    │       ├── Summary (good/bad counts)
    │       ├── Compliance table
    │       └── Critical actions list
    │
    └── EmailPreview (modal)
        ├── To field (editable)
        ├── Subject
        ├── HTML body preview
        ├── Attachment list with view links
        └── Cancel / Send buttons
```

### 6.3 Custom Hooks

**`useSession.js`** — Session lifecycle management:
- Generates and persists `sessionId` in `localStorage`
- Manages `sessionHistory` (array of past session IDs)
- Stores `profile`, `ttsEnabled`, and `rememberConversations` preference
- Provides: `startNewConversation()`, `switchConversation()`, `setProfile()`, `setTtsEnabled()`

**`useWebSocket.js`** — WebSocket connection:
- Connects to `ws://[API_BASE]/ws?session=[sessionId]`
- Auto-reconnects on disconnection (with exponential backoff)
- Message queue: buffers outgoing messages when disconnected
- Provides: `isConnected`, `send(payload)`

**`useVoice.js`** — Voice I/O:
- **STT**: Uses browser's Web Speech API (`SpeechRecognition`) for speech-to-text
  - Provides interim (live) and final transcripts
  - Supports continuous listening mode
- **TTS**: Uses browser's `SpeechSynthesis` for text-to-speech
  - Falls back to Deepgram TTS if `premiumTts` is available
  - Voice selection from available browser voices
- States: `IDLE` → `LISTENING` → `PROCESSING` → `SPEAKING` → `IDLE`
- Provides: `startListening()`, `stopListening()`, `speak()`, `stopSpeaking()`, `voiceOptions`, `selectedVoiceURI`

### 6.4 Utilities & Constants

**`utils/api.js`** — REST API client:
- All functions use `fetch` with `JSON.stringify` for POST bodies
- Session ID passed via `X-Session-Id` header or request body
- Functions: `fetchHealth`, `chatTurn`, `getForm`, `updateFormField`, `reviewForm`, `emailPreview`, `sendEmail`, `getSchedule`, `getStatus`

**`utils/constants.js`** — Shared constants:

| Constant | Value |
|----------|-------|
| `API_BASE` | `VITE_API_BASE` or `http://localhost:42819` |
| `ROLE_OPTIONS` | PCP, ACP, Superintendent, Commander, Deputy Chief, Chief |
| `SERVICE_OPTIONS` | EAI Ambulance, Muskoka, Peel, Toronto, York, Simco, Halton, Durham, Niagara, Ottawa, Hamilton, London-Middlesex |
| `VOICE_STATE` | `{ IDLE, LISTENING, PROCESSING, SPEAKING }` |
| `CONFIDENCE_CLASS` | `{ high: green, medium: yellow, low: red }` (Tailwind classes) |
| `FORM_LABELS` | `{ occurrence: "Occurrence Report", teddybear: "Teddy Bear Tracking" }` |

### 6.5 Styling & Animations

**CSS Architecture:**
- `index.css` — Tailwind directives (`@tailwind base/components/utilities`) + CSS custom properties for theming
- `App.css` — Component-specific keyframe animations
- `tailwind.config.js` — Custom theme extensions

**Design tokens** (CSS variables):
- `--primary` / `--primary-light` — Brand blue
- `--accent` — Accent color
- `--bg` / `--surface` — Background layers
- `--border` — Border color
- `--text` / `--text-secondary` — Text colors

**Custom animations:**
| Animation | Purpose |
|-----------|---------|
| `breathe` | Subtle pulsing effect |
| `sonar` | Expanding ring effect |
| `fieldFlash` | Highlight recently updated fields |
| `dotBounce` | Loading dots animation |
| `voicePulse` | Voice button idle pulse |
| `voiceListening` | Voice button active state |

### 6.6 User Flow

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│  App loads   │───>│  WelcomeScreen   │───>│  Profile saved to   │
│  main.jsx    │    │  Fill profile:   │    │  localStorage +     │
│              │    │  Name, Medic #,  │    │  session via WS     │
│              │    │  Badge, Role,    │    │                     │
│              │    │  Service, Vehicle│    │                     │
└─────────────┘    └──────────────────┘    └─────────┬───────────┘
                                                     │
                                                     ▼
                          ┌──────────────────────────────────────┐
                          │           Main Interface             │
                          │  ┌──────────┐   ┌─────────────────┐  │
                          │  │   Chat   │   │   Right Panel   │  │
                          │  │  Panel   │   │  (Form/Sched/   │  │
                          │  │          │   │   Status)        │  │
                          │  └──────────┘   └─────────────────┘  │
                          └──────────────────────────────────────┘
                                     │
            ┌────────────────────────┼────────────────────────┐
            ▼                        ▼                        ▼
  ┌──────────────────┐   ┌───────────────────┐   ┌───────────────────┐
  │  Form Filling    │   │  Schedule Query   │   │  Status Query     │
  │                  │   │                   │   │                   │
  │ User speaks/types│   │ "Who is on shift?"│   │ "What's my status │
  │ about an incident│   │ → Scrape website  │   │  today?"          │
  │ → AI extracts    │   │ → Show ShiftView  │   │ → Load status data│
  │   fields         │   │                   │   │ → Show Dashboard  │
  │ → Form auto-fills│   └───────────────────┘   └───────────────────┘
  │ → User reviews   │
  └────────┬─────────┘
           ▼
  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
  │  Review & Send   │───>│  Email Preview   │───>│  Email Sent      │
  │  Click button    │    │  Modal shown     │    │  Form archived   │
  │                  │    │  Edit recipient  │    │  Artifacts saved │
  │                  │    │  View PDF/XML    │    │  (PDF + XML)     │
  └──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## 7. Real-Time Communication Protocol

### WebSocket Connection

```
Client → ws://localhost:42819/ws?session=<uuid>
Server → { type: "session_init", sessionId, session }
```

### Message Types — Client to Server

| Type | Payload | Purpose |
|------|---------|---------|
| `user_message` | `{ text, source? }` | Send a chat message (source: "voice" or "typed") |
| `update_profile` | `{ profile }` | Update paramedic profile |
| `update_form_field` | `{ formType, field, value }` | Manually edit a form field |
| `request_form_review` | `{ formType? }` | Request validation summary for review |
| `set_current_form` | `{ formType? }` | Switch active form (or null to clear) |
| `ping` | `{}` | Keep-alive |

### Message Types — Server to Client

| Type | Payload | Purpose |
|------|---------|---------|
| `session_init` | `{ sessionId, session }` | Full session state on connect |
| `typing` | `{ active }` | Typing indicator toggle |
| `assistant_message` | `{ result, formState? }` | AI response + updated form |
| `profile_updated` | `{ payload }` | Confirmed profile update |
| `form_updated` | `{ payload }` | Updated form state after field edit |
| `form_review` | `{ formType, profile, formData, confidence, validation }` | Full form review data |
| `current_form_set` | `{ currentForm }` | Confirmed form switch |
| `pong` | `{ ts }` | Keep-alive response |
| `error` | `{ message }` | Error notification |

### Sequence Diagram — Chat Message Flow

```
Client                    Server                    LLM (OpenRouter)
  │                         │                            │
  │─── user_message ───────>│                            │
  │                         │─── typing: true ──────────>│
  │<── typing: true ────────│                            │
  │                         │                            │
  │                         │── build prompts ──────────>│
  │                         │                            │
  │                         │<── JSON response ──────────│
  │                         │                            │
  │                         │── normalize + autofill     │
  │                         │── update session           │
  │                         │                            │
  │<── assistant_message ───│                            │
  │    (result + formState) │                            │
  │                         │                            │
```

---

## 8. Data Models & Persistence

### Session Model

```javascript
{
  id: "uuid",
  createdAt: "ISO timestamp",

  profile: {
    firstName: "Jamie",
    lastName: "Adams",
    medicNumber: "10456",      // 5-digit Ministry of Health number
    badgeNumber: "B-2847",
    role: "Primary Care Paramedic",
    service: "EAI Ambulance Service",
    vehicleNumber: "4521"      // 4-digit vehicle number
  },

  messages: [                   // Capped at 40 messages
    {
      role: "user" | "assistant",
      content: "message text",
      timestamp: "ISO timestamp",
      source: "voice" | "typed",    // (user messages only)
      intent: "fill_form",          // (assistant messages only)
      formType: "occurrence",       // (if form-related)
      formUpdates: { ... }          // (if form fields were extracted)
    }
  ],

  activeForms: {
    "occurrence": {
      fields: { date: "2026-03-04", time: "14:30", ... },
      confidence: { date: "high", time: "high", ... },
      status: "draft" | "review" | "sent",
      updatedAt: "ISO timestamp"
    },
    "teddybear": { ... }
  },

  currentForm: "occurrence" | "teddybear" | null,

  formHistory: [                // Completed/sent forms
    {
      id: "uuid",
      formType: "occurrence",
      completedAt: "ISO timestamp",
      fields: { ... },
      confidence: { ... },
      status: "sent"
    }
  ],

  artifacts: [                  // Generated files
    {
      id: "uuid",
      draftId: "session-uuid",
      type: "pdf" | "xml",
      path: "/api/artifacts/filename.pdf",
      createdAt: "ISO timestamp",
      formType: "occurrence",
      fileName: "occurrence-report-abc123.pdf"
    }
  ]
}
```

### Persistence Strategy

| Storage | What | Where | Frequency |
|---------|------|-------|-----------|
| **Server memory** | Full session objects | `SessionManager` Map | Real-time |
| **Server disk** | Session snapshots | `data/drafts.json` | Every 30 seconds |
| **Server disk** | Generated files | `data/artifacts/*.pdf`, `*.xml` | On export |
| **Client localStorage** | Session ID | `medicos_session_id` | On create |
| **Client localStorage** | Session history | `medicos_session_history` | On switch |
| **Client localStorage** | Profile | `medicos_profile` | On profile set |
| **Client localStorage** | Preferences | `medicos_tts_*`, `medicos_remember_*` | On change |

---

## 9. Testing & Mock Infrastructure

### Test Suite (Node.js built-in test runner)

| Test File | What It Tests | Key Assertions |
|-----------|--------------|----------------|
| `schemas.test.js` | Zod schemas parse correctly | Valid occurrence data parses; invalid teddy bear data fails |
| `validation.test.js` | Form validation rules | Empty form → errors; valid form → canExport; bad medic # → error; bad vehicle # → warning |
| `xml-generation.test.js` | XML builder output | Minimal form → no SecondMedic/Recipient tags; full form → all tags present |
| `mock-datasets.test.js` | Curated mock data integrity | All occurrence/teddy bear cases validate as expected; XML includes/excludes correct; status/schedule snapshots match |

**Run tests:** `npm test` (uses `node --test`)

### Mock Data System

**`mocks/mock-datasets.js`** — Hand-curated test fixtures:
- `mockProfiles` — 2 paramedic profiles (Jamie Adams, Lisa Patel)
- `occurrenceCases` — Occurrence forms with expected validation results
- `teddyBearCases` — Teddy Bear forms with expected validation results
- `teddyBearXMLCases` — Teddy Bear forms with expected XML content
- `statusSnapshot` — Expected status data structure
- `scheduleSnapshot` — Expected schedule data structure
- `pipelineIntentPrompts` — Intent classification test vectors
- `sourceDocuments` — Reference document metadata

### Mock Generator (`scripts/generate-mocks.js`)

A deterministic mock generator with CLI interface:

```
node scripts/generate-mocks.js [options]

Options:
  --count <n>       Valid scenarios per form type (default: 8)
  --seed <n>        RNG seed for reproducibility (default: timestamp)
  --output <dir>    Output directory (default: mocks/generated)
  --with-tests      Also generate a .test.js file
  --valid-only      Only generate valid form cases
```

- Uses Mulberry32 PRNG for deterministic randomness
- For each index: generates valid + invalid variants for both form types
- Invalid variants: missing required fields, bad medic numbers, bad vehicle numbers, bad ages
- Outputs: JSON suite + optional test file that validates each case

---

## 10. External Integrations

### LLM — OpenRouter / Google Gemini

```
Flow: User text → System prompt + User prompt → OpenRouter API → JSON response
Model: google/gemini-2.5-flash (configurable via OR_MODEL_FAST / OR_MODEL_STRONG)
Mode: JSON output with retry on parse failure
Fallback: Local rule-based pipeline when LLM is unavailable
```

The system prompt instructs the LLM to return a structured JSON object with:
- Intent classification (fill_form, status_query, shift_query, general, etc.)
- Form field extraction (key-value pairs with confidence levels)
- Validation warnings
- Natural language response
- Follow-up questions and suggested actions

### Weather — Open-Meteo (Primary, Free)

```
Endpoint: https://api.open-meteo.com/v1/forecast
Location: Toronto (43.65, -79.38)
Data: temperature, wind speed, weather condition
No API key required
```

### Schedule — EffectiveAI.net Scraping

```
Target: https://www.effectiveai.net
Method: Fetch homepage → find schedule links → fetch each → parse tables with Cheerio
Cache: 5 minutes
Fallback: schedule-fallback.json
```

### Email — Resend via SMTP

```
Protocol: SMTP (port 587)
Host: smtp.resend.com
Auth: Resend API key as password
Demo mode: Logs to console instead of sending
Attachments: PDF report + XML data (for teddy bear)
```

### Voice — Web Speech API + Optional Deepgram

```
STT (Primary): Browser Web Speech API (SpeechRecognition)
STT (Server):  Deepgram nova-2-medical (when API key configured)
TTS (Primary): Browser SpeechSynthesis
TTS (Server):  Deepgram aura-asteria-en (when API key configured)
```

---

## 11. Hackathon Challenge Alignment

The hackathon required an AI assistant for paramedics that helps complete forms and routine tasks. Here is how each requirement maps to the implementation:

| Challenge Requirement | Implementation | Status |
|----------------------|----------------|--------|
| **Form 1: Occurrence Report** | 24-field form with AI extraction, PDF export, email delivery, manual review step | Fully implemented |
| **Form 2: Teddy Bear Tracking** | 11-field form with AI extraction, PDF + XML export, email delivery | Fully implemented |
| **Form 3: Shift Schedule** | Web scraping of EffectiveAI.net, conversational Q&A, tabular display | Fully implemented |
| **Form 4: Paramedic Status** | Bundled status data, conversational Q&A, compliance dashboard | Fully implemented |
| **Interactive AI assistant** | OpenRouter/Gemini LLM with structured extraction, follow-ups, suggested actions | Fully implemented |
| **Voice interaction** | Web Speech API STT/TTS with optional Deepgram premium | Fully implemented |
| **Email delivery** | Nodemailer via Resend SMTP with PDF/XML attachments | Fully implemented |
| **Manual review before send** | Email preview modal with editable recipient, attachment viewing | Fully implemented |
| **5-digit medic number** | Validated in form validation, profile setup, and Zod schemas | Fully implemented |
| **Print-ready form** | Puppeteer PDF generation with professional HTML templates | Fully implemented |
| **XML data (Teddy Bear)** | xml2js builder with proper schema | Fully implemented |
| **Friendly UX for tired medics** | Clean two-panel UI, voice-first design, auto-fill from profile, suggested actions | Fully implemented |

---

## 12. Key Design Decisions

(Sourced from `DECISIONS.md` and code analysis)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Architecture** | Monorepo (root server + client/) | Single repo simplicity for hackathon |
| **LLM Provider** | OpenRouter → Gemini | Free tier, JSON mode support, medical domain capability |
| **LLM Model** | google/gemini-2.5-flash | Fast, capable, cost-effective |
| **Voice STT** | Web Speech API (browser) | Zero-dependency, works offline, no API key needed |
| **Voice TTS** | Browser SpeechSynthesis + optional Deepgram | Fallback-first approach |
| **PDF Generation** | Puppeteer | Full HTML/CSS rendering for professional output |
| **XML Format** | xml2js Builder | Simple, dependency-light XML construction |
| **Email** | Resend via SMTP (Nodemailer) | Free tier, reliable SMTP delivery |
| **Weather** | Open-Meteo (primary) | Free, no API key, reliable |
| **Session Storage** | In-memory + JSON file | No database needed; survives restarts |
| **State Management** | React useState (no Redux/Zustand) | Simple enough for single-page app |
| **Real-time** | WebSocket (ws library) | Lower latency than polling; bidirectional |
| **Styling** | Tailwind CSS | Rapid prototyping, consistent design |
| **Form Validation** | Zod + custom domain rules | Type-safe schemas + business logic |
| **App Name** | ParaHelper | Friendly, approachable name for paramedics |
| **Demo Mode** | DEMO_MODE env flag | Prevents accidental email sends during development |

---

## 13. Unused / Dead Code

The following components exist in the codebase but are not imported or rendered in the active component tree:

| Component | Purpose | Why Unused |
|-----------|---------|------------|
| `FormPanel.jsx` | Alternative form panel with direct REST API calls | Replaced by `FormPreview.jsx` which uses WebSocket |
| `ProfileSetup.jsx` | Alternative profile form branded "ParaHelper" | Replaced by `WelcomeScreen.jsx` |
| `ScheduleView.jsx` | Standalone schedule view with its own API call | Replaced by `ShiftView.jsx` which receives data as props |
| `StatusView.jsx` | Standalone status view with its own API call | Replaced by `StatusDashboard.jsx` which receives data as props |
| `EmailPreviewModal.jsx` | Alternative email modal with two-step confirmation | Replaced by `EmailPreview.jsx` |
| `chatTurn` (api.js) | REST-based chat endpoint | Chat uses WebSocket instead |

These appear to be earlier iterations that were superseded by improved versions during development.

---

## 14. Potential Improvements

### Architecture
- Database-backed sessions (SQLite/PostgreSQL) for production reliability
- Authentication and authorization (JWT or session cookies)
- Rate limiting on API endpoints
- Horizontal scaling with Redis-backed sessions

### Features
- Offline support with service workers and local form caching
- Multi-language support for diverse paramedic teams
- Form templates for additional Ontario paramedic forms
- Photo/image attachment support for occurrence reports
- Audit trail and form versioning

### Code Quality
- Remove 5 unused components (~500 lines of dead code)
- TypeScript migration for type safety across the full stack
- Extract WebSocket message handlers into separate modules
- Add integration tests for the AI pipeline
- Add E2E tests with Playwright/Cypress

### Performance
- WebSocket heartbeat optimization
- Form state diffing (only send changed fields)
- PDF generation queue for concurrent requests
- CDN for static assets in production

### UX
- Dark mode support (CSS variables are already in place)
- Keyboard shortcuts for power users
- Form field autocomplete from historical data
- Progress persistence across browser sessions (currently only profile persists)

---

*Generated: March 4, 2026*
*Codebase version: 1.0.0*
