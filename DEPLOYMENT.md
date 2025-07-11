# Google OAuth + Supabase + n8n Integration Deployment Guide

## Overview

This guide covers the complete setup for Google OAuth integration with Supabase backend and n8n automation.

## 1. Google Cloud Console Setup

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable billing (required for OAuth)

### 1.2 Enable Required APIs

```bash
# Enable Google Calendar API
gcloud services enable calendar.googleapis.com

# Enable Google People API (for contacts)
gcloud services enable people.googleapis.com

# Enable Google+ API (for profile)
gcloud services enable plus.googleapis.com
```

### 1.3 Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Set application type to "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:3000/oauth2callback` (development)
   - `https://yourdomain.com/oauth2callback` (production)
5. Copy the Client ID and Client Secret

## 2. Supabase Setup

### 2.1 Create Supabase Project

1. Go to [Supabase](https://supabase.com/)
2. Create a new project
3. Note down your project URL and anon key

### 2.2 Run Database Migrations

```bash
# Deploy the migration
supabase db push

# Or run manually in Supabase SQL editor:
```

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_google_tokens table
CREATE TABLE IF NOT EXISTS user_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT NOT NULL,
  scope TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_google_user_id ON users(google_user_id);
CREATE INDEX IF NOT EXISTS idx_user_google_tokens_user_id ON user_google_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_google_tokens_google_user_id ON user_google_tokens(google_user_id);
```

### 2.3 Deploy Edge Function

```bash
# Deploy the Google Calendar auth function
supabase functions deploy google-calendar-auth
```

### 2.4 Set Environment Variables in Supabase

```bash
# Set Google OAuth variables
supabase secrets set GOOGLE_CLIENT_ID=your_google_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=your_google_client_secret
supabase secrets set REDIRECT_URI=http://localhost:3000/oauth2callback

# Set n8n variables
supabase secrets set N8N_BASE_URL=http://localhost:5678
supabase secrets set N8N_API_KEY=your_n8n_api_key
```

## 3. n8n Setup

### 3.1 Install n8n

```bash
# Install n8n globally
npm install -g n8n

# Or use Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### 3.2 Configure n8n API

1. Start n8n: `n8n start`
2. Go to http://localhost:5678
3. Set up admin user
4. Go to Settings > API Keys
5. Create a new API key for your application

### 3.3 Create n8n Workflow

1. Create a new workflow in n8n
2. Add a "Webhook" trigger node
3. Add a "Google Calendar" node
4. Configure the Google Calendar node to use OAuth2
5. Save the workflow and note the webhook URL

## 4. Environment Variables

Create a `.env` file in your project root:

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
```

## 5. Testing the Integration

### 5.1 Test Google OAuth Flow

1. Start your React app: `npm run dev`
2. Click the "Connect Google Account" button
3. Complete Google OAuth flow
4. Check Supabase database for stored tokens

### 5.2 Test n8n Integration

1. Check n8n logs for credential injection
2. Verify workflow is triggered
3. Check Google Calendar for any created events

## 6. Production Deployment

### 6.1 Update Redirect URIs

- Update Google OAuth redirect URI to your production domain
- Update Supabase environment variables
- Update React app environment variables

### 6.2 Deploy to Production

```bash
# Build React app
npm run build

# Deploy to your hosting platform
# (Vercel, Netlify, etc.)

# Deploy Supabase functions
supabase functions deploy google-calendar-auth --project-ref your-project-ref
```

## 7. Troubleshooting

### Common Issues

1. **"Missing required parameter client_id"**

   - Check that `VITE_GOOGLE_CLIENT_ID` is set in `.env`
   - Restart dev server after changing environment variables

2. **"Failed to exchange authorization code"**

   - Verify redirect URI matches exactly in Google Cloud Console
   - Check that client secret is correct

3. **"Database error"**

   - Ensure Supabase tables are created
   - Check RLS policies are configured correctly

4. **"n8n integration failed"**
   - Verify n8n is running on correct port
   - Check API key is valid
   - Ensure workflow webhook URL is correct

### Debug Commands

```bash
# Check Supabase logs
supabase functions logs google-calendar-auth

# Check n8n logs
n8n start --debug

# Test Supabase connection
supabase status
```

## 8. Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **Client Secret**: Keep Google client secret secure
3. **Tokens**: Store tokens securely in Supabase with RLS enabled
4. **HTTPS**: Use HTTPS in production for all OAuth flows
5. **API Keys**: Rotate n8n API keys regularly

## 9. Monitoring

1. **Google OAuth**: Monitor OAuth consent screen usage
2. **Supabase**: Monitor function invocations and database usage
3. **n8n**: Monitor workflow executions and errors
4. **Application**: Monitor user authentication success rates
