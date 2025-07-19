# Migration Guide: Supabase to Express.js

This guide will help you migrate from Supabase to a custom Express.js backend with PostgreSQL, JWT authentication, and WebSocket support.

## 🎯 Overview

The migration replaces Supabase with:

- **Express.js server** with PostgreSQL database
- **JWT authentication** instead of Supabase Auth
- **WebSocket support** for real-time features
- **Custom endpoints** for all Supabase edge functions
- **Enhanced security** with proper token management

## 📋 Prerequisites

1. **PostgreSQL Database**

   - Local PostgreSQL installation, or
   - Cloud PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)

2. **Node.js Environment**

   - Node.js 18+ installed
   - npm or yarn package manager

3. **Environment Variables**
   - Google OAuth credentials
   - n8n configuration
   - Database connection string

## 🚀 Step 1: Set Up Express Server

### 1.1 Install Dependencies

```bash
# Install server dependencies
npm install express cors jsonwebtoken bcryptjs pg ws dotenv node-fetch

# Install dev dependencies
npm install --save-dev nodemon
```

### 1.2 Configure Environment Variables

Create `oauth.env` file:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/deana_ai

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
REDIRECT_URI=http://localhost:3000/oauth2callback

# n8n
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your_n8n_api_key

# Server
PORT=3001
NODE_ENV=development
```

### 1.3 Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🔄 Step 2: Migrate Data

### 2.1 Run Migration Script

The migration script will transfer:

- ✅ Users and authentication data
- ✅ Google OAuth tokens
- ✅ Chat logs
- ✅ ElevenLabs configuration
- ✅ Workflow status data

### 2.2 Verify Migration

Check your PostgreSQL database to ensure all data was migrated correctly:

```sql
-- Check users
SELECT COUNT(*) FROM users;

-- Check tokens
SELECT COUNT(*) FROM user_google_tokens;

-- Check chat logs
SELECT COUNT(*) FROM ai_chat_logs;
```

## 🔧 Step 3: Update Frontend

### 3.1 Update API Constants

The `src/constants/apiConstants.ts` file has been updated to use Express server endpoints.

### 3.2 Update Authentication

The auth store now includes JWT token management:

```typescript
// Store JWT token after OAuth
if (data.jwt_token) {
  setJwtToken(data.jwt_token);
}

// Use JWT in API calls
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${jwtToken}`,
};
```

### 3.3 Update TTS Integration

TTS now uses Express server endpoints instead of Supabase edge functions:

```typescript
// Before (Supabase)
const { data } = await supabase.functions.invoke("openai-tts", {
  body: { text, voice },
});

// After (Express)
const response = await fetch(BACKEND_TTS_ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text, voice }),
});
```

### 3.4 Add WebSocket Support

New WebSocket hook for real-time features:

```typescript
import { useWebSocket } from "@/hooks/useWebSocket";

const { isConnected, sendMessage } = useWebSocket({
  onMessage: (message) => {
    console.log("Received:", message);
  },
});
```

## 🗑️ Step 4: Remove Supabase Dependencies

### 4.1 Remove Supabase Packages

```bash
npm uninstall @supabase/supabase-js
```

### 4.2 Remove Supabase Files

Delete these files and directories:

- `src/integrations/supabase/`
- `supabase/`
- `supabase/config.toml`

### 4.3 Update Environment Variables

Remove Supabase-related environment variables from your frontend `.env`:

```env
# Remove these
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# Keep these
VITE_GOOGLE_CLIENT_ID=...
VITE_GOOGLE_CLIENT_SECRET=...
VITE_OAUTH_REDIRECT_URI=...
```

## 🔒 Step 5: Security Considerations

### 5.1 JWT Token Management

- Tokens expire after 7 days
- Store tokens securely in localStorage
- Implement token refresh logic if needed

### 5.2 Database Security

- Use connection pooling
- Implement proper RLS policies
- Regular database backups

### 5.3 Environment Variables

- Never commit secrets to version control
- Use different secrets for development/production
- Rotate secrets regularly

## 🧪 Step 6: Testing

### 6.1 Test Authentication Flow

1. Start Express server: `npm run dev`
2. Start React app: `npm run dev`
3. Test Google OAuth flow
4. Verify JWT token storage
5. Test protected routes

### 6.2 Test Chat Functionality

1. Send a message in chat
2. Verify n8n integration works
3. Check TTS functionality
4. Test WebSocket connections

### 6.3 Test Data Migration

1. Verify all users migrated
2. Check OAuth tokens work
3. Confirm chat history preserved
4. Test configuration settings

## 🚀 Step 7: Production Deployment

### 7.1 Database Setup

```bash
# Create production database
createdb deana_ai_prod

# Run migrations
psql -d deana_ai_prod -f migrations/init.sql
```

### 7.2 Environment Configuration

```env
# Production environment
NODE_ENV=production
DATABASE_URL=postgresql://prod_user:prod_pass@prod_host:5432/deana_ai_prod
JWT_SECRET=your-production-jwt-secret
```

### 7.3 Process Management

Use PM2 or similar for production:

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server.js --name "deana-ai-server"

# Monitor
pm2 status
pm2 logs deana-ai-server
```

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**

   ```bash
   # Check PostgreSQL is running
   sudo systemctl status postgresql

   # Test connection
   psql -h localhost -U username -d deana_ai
   ```

2. **JWT Token Invalid**

   - Check JWT_SECRET is set correctly
   - Verify token expiration
   - Clear localStorage and re-authenticate

3. **OAuth Flow Broken**

   - Verify redirect URIs match
   - Check Google Cloud Console settings
   - Ensure server is running on correct port

4. **TTS Not Working**
   - Check ElevenLabs API key
   - Verify Express server TTS endpoint
   - Check network connectivity

### Debug Commands

```bash
# Check server logs
npm run dev

# Test database connection
node -e "require('./server.js')"

# Verify environment variables
node -e "require('dotenv').config(); console.log(process.env)"
```

## 📊 Performance Comparison

| Feature            | Supabase           | Express.js             |
| ------------------ | ------------------ | ---------------------- |
| **Database**       | Managed PostgreSQL | Self-hosted PostgreSQL |
| **Authentication** | Supabase Auth      | JWT + Custom Logic     |
| **Edge Functions** | Deno Runtime       | Node.js                |
| **Real-time**      | Supabase Realtime  | WebSocket              |
| **Cost**           | Pay-per-use        | Fixed hosting costs    |
| **Control**        | Limited            | Full control           |
| **Customization**  | Limited            | Unlimited              |

## 🎉 Migration Complete!

After completing these steps, you'll have:

- ✅ **Full control** over your backend
- ✅ **Better performance** with direct database access
- ✅ **Enhanced security** with JWT authentication
- ✅ **Real-time features** with WebSocket
- ✅ **Cost savings** from self-hosting
- ✅ **Unlimited customization** possibilities

## 📞 Support

If you encounter issues during migration:

1. Check the troubleshooting section above
2. Review server logs for error messages
3. Verify all environment variables are set correctly
4. Test each component individually

The Express server provides all the functionality of Supabase with greater flexibility and control over your application's backend infrastructure.
