# ParaHelper — Decision Record

## Team
- **Team Number:** 07
- **Email Target:** Team07@EffectiveAI.net

## Scope
- All 4 capabilities: Occurrence Report, Teddy Bear Tracking, Shift Schedule Q&A, Status Report Q&A
- Graceful rejection for unrecognized requests (e.g., uniform ordering)
- Single-screen layout: chat + live form side-by-side

## Voice Strategy
- **STT:** Web Speech API (continuous mode, no push-to-talk) — toggleable on/off
- **TTS:** Browser SpeechSynthesis — toggleable on/off
- **Mode toggle:** Voice-only, text-only, or both
- No push-to-talk — hands-free continuous listening when voice is on

## LLM
- **Provider:** Google Gemini (all calls)
- **Fast model:** google/gemini-3.1-flash-lite (workhorse for every turn)
- **Strong model:** google/gemini-3.1-flash-lite (same — fast + reliable for hackathon)
- **JSON mode:** response_format: json_object with retry-heal on parse failure
- **Budget:** $100 total

## Email
- **Service:** Resend via SMTP (nodemailer)
- **Manual review step required** before any send (email preview modal)
- **PDF download** also available locally
- **PDFs** are faithful replicas of original form styling

## Data Sources
- **Schedule:** Live scrape from effectiveai.net, 5-min cache, fallback JSON
- **Status Report:** Bundled from Paramedic Checklist data, answers as if personalized
- **Weather:** Open-Meteo (free, no key) with OpenWeatherMap upgrade path

## Architecture
- **Monorepo:** Express (server) + Vite/React (client)
- **Real-time:** WebSocket for chat, form patches, typing indicators
- **REST fallback:** All endpoints also accessible via REST
- **Session persistence:** JSON file on disk, survives server restart
- **PDF generation:** Puppeteer HTML-to-PDF
- **XML:** xml2js builder for Teddy Bear

## UX
- **App name:** ParaHelper
- **Tone:** Calm professional / friendly coworker
- **Confidence indicators:** Nice-to-have (green/yellow/red dots per field)
- **Wow moment:** Speed, polish, natural conversation flow

## Deployment Target
- Cloudflare (Pages + Workers) or local demo
- One-command dev startup: `npm run dev`

## Starting Point
- Building on existing medicos scaffold (well-structured backend, partial client)
- Not greenfield — the existing code quality is high and matches requirements exactly
