# Deana AI Server

A modular Express.js server that provides OAuth, chat, TTS, and WebSocket functionality for the Deana AI application.

## 🏗️ Architecture

The server has been refactored into a modular structure for better maintainability:

```
deana-ai-server/
├── config/
│   ├── database.js      # Database configuration and initialization
│   └── environment.js   # Environment variables and configuration
├── middleware/
│   └── auth.js          # JWT authentication middleware
├── routes/
│   ├── oauth.js         # Google OAuth endpoints
│   ├── chat.js          # Chat and streaming endpoints
│   ├── tts.js           # Text-to-speech endpoints
│   └── config.js        # Configuration and utility endpoints
├── services/
│   ├── n8nService.js    # N8N integration service
│   ├── ttsService.js    # Text-to-speech service
│   └── websocketService.js # WebSocket handling service
├── server.js            # Original monolithic server
├── server-new.js        # New modular server
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Google OAuth credentials
- ElevenLabs API key

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment file:

   ```bash
   cp oauth.env.example oauth.env
   ```

3. Configure your environment variables in `oauth.env`

4. Start the server:

   ```bash
   # Use the original monolithic server
   npm start

   # Use the new modular server
   npm run start:new

   # Development with auto-reload
   npm run dev:new
   ```

## 📁 Module Structure

### Configuration (`config/`)

- **`database.js`**: PostgreSQL connection, table creation, and cleanup functions
- **`environment.js`**: Environment variable loading and configuration

### Middleware (`middleware/`)

- **`auth.js`**: JWT token validation and generation

### Routes (`routes/`)

- **`oauth.js`**: Google OAuth flow and token management
- **`chat.js`**: Chat streaming with agent integration
- **`tts.js`**: Text-to-speech generation endpoints
- **`config.js`**: Configuration management and utility endpoints

### Services (`services/`)

- **`n8nService.js`**: N8N workflow and credential management
- **`ttsService.js`**: ElevenLabs TTS integration
- **`websocketService.js`**: Real-time WebSocket communication

## 🔧 API Endpoints

### OAuth

- `POST /google-oauth` - Google OAuth token exchange

### Chat

- `POST /chat` - Streaming chat with agent

### TTS

- `POST /tts` - Standard text-to-speech
- `POST /tts-stream` - Streaming text-to-speech

### Configuration

- `GET /health` - Health check
- `POST /test-token` - Generate test JWT token
- `GET /config/elevenlabs` - Get ElevenLabs configuration
- `PUT /config/elevenlabs` - Update ElevenLabs configuration
- `GET /chat-logs` - Get chat logs (authenticated)
- `GET /workflow-status/:sessionId` - Get workflow status
- `POST /workflow-status` - Update workflow status

### WebSocket

- `ws://localhost:3001` - Real-time communication

## 🔄 Migration

The server supports both the original monolithic structure (`server.js`) and the new modular structure (`server-new.js`). You can switch between them by using different npm scripts:

```bash
# Original server
npm start

# New modular server
npm run start:new
```

## 🛠️ Development

### Adding New Routes

1. Create a new route file in `routes/`
2. Export the router
3. Import and mount in `server-new.js`

### Adding New Services

1. Create a new service file in `services/`
2. Export the functions
3. Import and use in routes or other services

### Environment Variables

All environment variables are loaded in `config/environment.js` and exported as a `config` object for use throughout the application.

## 📝 Notes

- The modular structure makes the code more maintainable and testable
- Each module has a single responsibility
- Services can be easily mocked for testing
- Routes are organized by functionality
- Configuration is centralized and type-safe
