# Deana AI Chat Interface

A modern, accessible chat interface built with React, TypeScript, and Tailwind CSS. Ready for backend integration and n8n workflow automation.

## Features

- **Modern Chat UI**: Clean, responsive design inspired by leading AI assistants
- **Voice Synthesis**: Automatic text-to-speech for bot messages with mute/unmute
- **Markdown Support**: Rich text rendering in chat bubbles
- **Action Buttons**: Interactive buttons for enhanced user engagement
- **Accessibility**: Full ARIA support and keyboard navigation
- **Mobile Responsive**: Optimized for both desktop and mobile devices
- **State Management**: Lightweight store with Zustand
- **Backend Ready**: Placeholder functions for API integration

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Markdown** for rich text support
- **shadcn/ui** components
- **Lucide React** for icons

## Getting Started

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Start development server**:

   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── components/          # React components
│   ├── Avatar.tsx      # User/bot avatar component
│   ├── Bubble.tsx      # Chat message bubble
│   ├── ActionButtons.tsx # Interactive action buttons
│   ├── ChatContainer.tsx # Messages container with auto-scroll
│   ├── ChatInput.tsx   # Message input with send functionality
│   └── ChatHeader.tsx  # Header with voice controls
├── hooks/              # Custom React hooks
│   └── useChat.ts      # Chat logic and API integration
├── store/              # State management
│   └── chatStore.ts    # Zustand store for chat state
├── utils/              # Utility functions
│   └── api.ts          # API integration placeholders
└── pages/              # Page components
    └── Index.tsx       # Main chat page
```

## Integration Points

### Backend API Integration

Replace the placeholder in `src/utils/api.ts`:

```typescript
export const sendMessageToDeana = async (text: string): Promise<Message[]> => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text }),
  });
  return response.json();
};
```

### n8n Workflow Integration

Use the n8n webhook function in `src/utils/api.ts`:

```typescript
await callN8nWebhook("https://your-n8n-instance.com/webhook/your-id", {
  message: text,
  userId: "user-123",
  timestamp: new Date().toISOString(),
});
```

### Action Button Handling

Customize action handling in `src/utils/api.ts`:

```typescript
export const handleActionClick = (actionId: string): void => {
  switch (actionId) {
    case "book-appointment":
      // Trigger n8n workflow for booking
      callN8nWebhook("/webhook/book-appointment", { actionId });
      break;
    case "get-weather":
      // Call weather API
      break;
  }
};
```

## Configuration

### Voice Settings

Customize voice synthesis in `src/store/chatStore.ts`:

```typescript
const utterance = new SpeechSynthesisUtterance(message.text);
utterance.rate = 0.9; // Speech speed
utterance.pitch = 1; // Voice pitch
utterance.volume = 0.8; // Volume level
```

### Message Types

Extend the Message interface in `src/store/chatStore.ts`:

```typescript
export interface Message {
  id: string;
  from: "user" | "bot";
  text: string;
  actions?: { id: string; label: string }[];
  timestamp?: Date;
  attachments?: File[]; // Add file support
  metadata?: any; // Add custom metadata
}
```

## Accessibility Features

- **Screen Reader Support**: All components have proper ARIA labels
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Live Regions**: New messages announced to screen readers
- **High Contrast**: Colors meet WCAG accessibility standards
- **Focus Management**: Proper focus handling throughout the interface

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Environment Variables

Create a `.env` file for configuration:

```env
# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret_here
VITE_OAUTH_REDIRECT_URI=http://localhost:3000/oauth2callback

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# n8n Configuration
VITE_N8N_BASE_URL=http://localhost:5678
VITE_N8N_API_KEY=your_n8n_api_key_here

# Other Configuration
VITE_API_BASE_URL=https://your-api.com
VITE_N8N_WEBHOOK_BASE=https://your-n8n.com/webhook
```

### Google OAuth Setup

To enable Google account connection:

1. **Create a Google Cloud Project**:

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Google APIs**:

   - Enable Google Calendar API
   - Enable Google People API (for contacts)
   - Enable Google+ API (for profile)

3. **Create OAuth 2.0 Credentials**:

   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Set application type to "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:5173` (for development)
     - `https://yourdomain.com` (for production)

4. **Set Environment Variables**:

   - Copy your Client ID to `REACT_APP_GOOGLE_CLIENT_ID`
   - Set `REACT_APP_OAUTH_REDIRECT_URI` to your redirect URI

5. **Backend Integration**:
   - The button will send the authorization code to `/api/google-calendar/auth`
   - Implement this endpoint to exchange the code for access/refresh tokens
   - Store tokens securely for future API calls

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
