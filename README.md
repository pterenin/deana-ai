# Deana.AI – Frontend (React)

A modern chat UI built with React + TypeScript + Vite + Tailwind. Integrates with the Deana.AI backend for Google OAuth, streaming chat (SSE), and Text‑to‑Speech (TTS).

## Features

- Fixed global Navbar with responsive drawer, route links, and mute toggle
- Streaming chat rendering (SSE) with incremental display
- TTS playback for AI responses using OpenAI gpt‑4o‑mini‑tts
  - Sentence chunking, deduplication, emoji skipping
  - Preload all sentence clips in parallel; play sequentially without overlap
  - Immediate stop on mute
- Google account management (primary + secondary) in Settings
- Phone input with country select using `react-phone-number-input`
  - Stored in localStorage as `user_phone_e164` (E.164 format)
  - Included in `/chat` payload to assistant service
- Mobile-friendly, keyboard accessible UI (shadcn/ui + Tailwind)

## Requirements

- Node.js 18+
- Backend server running at `http://localhost:3001`

## Quick Start

```bash
# In project root
npm install

# Run frontend (Vite dev server on http://localhost:3000)
npm run dev

# In another terminal, run backend
npm run server
```

Build and preview:

```bash
npm run build
npm run preview
```

## Environment

Set frontend OAuth envs (e.g., in `.env` or using Vite env files) as needed:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_OAUTH_REDIRECT_URI=http://localhost:3000/oauth2callback
```

Notes:

- The app expects Deana.AI backend at `http://localhost:3001` (see `src/constants/apiConstants.ts`). Adjust there if you deploy elsewhere.
- Navbar is fixed; pages add `pt-14` to avoid overlap.

## Key Flows

### Google OAuth

- Settings page kicks off Google OAuth for primary/secondary accounts.
- After callback (`/oauth2callback`), user is redirected to `/settings` with updated connection status.

### Chat + SSE

- Client sends `text`, `googleUserId`, optional `secondaryGoogleUserId`, optional `phone`, plus:
  - `timezone`: IANA zone (e.g., America/Los_Angeles)
  - `clientNowISO`: ISO8601 timestamp
- Backend streams assistant events via SSE; UI updates incrementally.

### TTS

- Default voice: `shimmer` (friendly female). Change via voice settings (store default in `src/store/chatStore.ts`).
- Streaming speech:
  - As text arrives, client splits by sentences, filters emoji/punctuation‑only, deduplicates, and requests `/tts-stream` per new sentence.
  - Audio is preloaded in parallel and played sequentially (no overlap).
  - Mute immediately stops current/queued audio.

### Phone input

- `Settings` → Phone section uses `react-phone-number-input` with country select.
- Value saved to localStorage as `user_phone_e164` (E.164). Not displayed as an example in UI.
- Included with `/chat` payload when present.

## Scripts

- `npm run dev` – start Vite dev server
- `npm run build` – production build
- `npm run preview` – preview production build
- `npm run server` – run backend server (from root)

## Troubleshooting

- Port conflicts: stop existing processes on 3000 (frontend) or 3001 (backend) if you see EADDRINUSE.
- CORS: Backend is locked down to `CORS_ORIGIN` (default `http://localhost:3000`). If deploying frontend elsewhere, set this env on the backend.
- Autoplay: Browsers may block audio before a user gesture. Interact with the page (e.g., click) once per session.

## Production Notes

- Serve behind TLS and a reverse proxy (Nginx/Caddy). Match backend `CORS_ORIGIN` to the deployed frontend URL.
- Consider chunk size/code splitting if bundle warnings persist.
- Keep environment variables out of version control.
