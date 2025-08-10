# Deana.AI – Backend (Express)

Express server providing Google OAuth, chat streaming (SSE), and OpenAI TTS proxy for Deana.AI.

## Features

- Google OAuth (primary + secondary accounts) with token refresh and account titles
- Chat SSE proxy to assistant service (`${AGENT_BASE_URL}/api/chat/stream`, default local `http://localhost:3060`)
- TTS proxy to OpenAI (`/tts`, `/tts-stream`) with streaming
- Caching of user/token metadata with safe invalidation
- Security hardening:
  - helmet headers, CORS lock‑down, JSON body size limit
  - Zod validation for `/chat`, `/tts`, `/tts-stream`
  - Rate limiting for `/chat` and `/tts*`
  - SSE error handling and client‑disconnect aborts

## Requirements

- Node.js 18+
- PostgreSQL
- Google OAuth Client ID/Secret
- OpenAI API key

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create env file:

   ```bash
   cp oauth.env.example oauth.env
   ```

3. Populate `oauth.env`:

   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/deana_ai

   # JWT
   JWT_SECRET=change-me

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   REDIRECT_URI=http://localhost:3000/oauth2callback

   # OpenAI
   OPENAI_API_KEY=sk-your-openai-key

   # Agentic Workflow Service
   AGENT_BASE_URL=http://localhost:3060
   # For AWS App Runner:
   # AGENT_BASE_URL=https://tszd6sxek5.us-east-2.awsapprunner.com

   # Server
   PORT=3001
   NODE_ENV=development

   # CORS (frontend origin)
   CORS_ORIGIN=http://localhost:3000

   # (optional) Supabase migration
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   ```

4. Start the server:
   ```bash
   npm start
   # or development with auto-reload
   npm run dev
   ```

## Endpoints

### OAuth

- `POST /google-oauth` – exchange code, store tokens, return JWT
- `POST /google-disconnect` – revoke and remove tokens
- `GET /user-accounts/:googleUserId` – list accounts (auto-refresh if expired)

### Chat (SSE)

- `POST /chat` – body (validated by Zod):
  ```json
  {
    "text": "Hi",
    "googleUserId": "...",
    "secondaryGoogleUserId": "...optional...",
    "phone": "+16049108101 (optional)",
    "timezone": "America/Los_Angeles",
    "clientNowISO": "2025-08-09T12:34:56.000Z"
  }
  ```
  Streams server-sent events: `status`, `progress`, `response`, `complete`, `error`, `final`.

### TTS

- `POST /tts` – returns base64 `{ audioContent }` (mp3)
- `POST /tts-stream` – streams audio (mp3/opus). Body (Zod‑validated):
  ```json
  { "text": "Hello", "voice": "shimmer", "response_format": "mp3" }
  ```

### Config/Utils

- `GET /health` – health check
- `GET /chat-logs` – requires JWT
- `GET /workflow-status/:sessionId`
- `POST /workflow-status`

## Security

- Headers: `helmet` enabled, `x-powered-by` disabled
- CORS: restricted to `CORS_ORIGIN` (default `http://localhost:3000`)
- Body limit: `express.json({ limit: '256kb' })`
- Validation: Zod schemas for `/chat`, `/tts`, `/tts-stream`
- Rate limiting:
  - `/chat`: 20 req/min/IP
  - `/tts*`: 30 req/min/IP
- SSE robustness: client disconnect aborts upstream; error events after SSE start

## Notes

- Assistant proxy target is `${AGENT_BASE_URL}/api/chat/stream`. Use local default or AWS URL.
- Tokens are cached; cache invalidated on critical changes (e.g., OAuth updates).
- Avoid logging secrets/PII; phone and tokens are not logged.

## Run locally with frontend

- Frontend at `http://localhost:3000` (Vite dev server)
- Backend at `http://localhost:3001`
- Ensure `CORS_ORIGIN` matches the frontend URL.
