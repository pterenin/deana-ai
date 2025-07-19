import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "oauth.env");
console.log("Loading environment from:", envPath);
console.log("File exists:", existsSync(envPath));

// Load environment variables first
const result = dotenv.config({ path: envPath, debug: true });
console.log("Dotenv result:", result);

try {
  const envContent = readFileSync(envPath, "utf8");
  console.log(
    "Env file content (first 200 chars):",
    envContent.substring(0, 200)
  );
} catch (error) {
  console.error("Error reading env file:", error);
}

// Now define all env-based constants here
const N8N_BASE_URL = process.env.N8N_BASE_URL || "http://localhost:5678";
const N8N_WEBHOOK_URL = `${N8N_BASE_URL}/webhook/request-assistence`;
const N8N_CREDENTIALS_URL = `${N8N_BASE_URL}/send-credentials`;
const N8N_REST_URL = `${N8N_BASE_URL}/api/v1`;
const N8N_WORKFLOW_ID = process.env.N8N_WORKFLOW_ID || "Nc4rOBvy6v75ngPL";
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";
const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://localhost:5432/deana_ai";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Now import constants after environment variables are loaded
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import crypto from "crypto";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// PostgreSQL connection
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// In-memory token storage (fallback)
const userTokens = new Map();
const websocketConnections = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// Database initialization
async function initializeDatabase() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        google_user_id TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        name TEXT,
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create user_google_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_google_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        google_user_id TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_type TEXT NOT NULL,
        scope TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        n8n_calendar_credential_id TEXT,
        n8n_gmail_credential_id TEXT,
        n8n_contacts_credential_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);

    // Create ai_chat_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_chat_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_question TEXT NOT NULL,
        ai_response TEXT,
        user_agent TEXT,
        user_ip TEXT,
        user_location JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create elevenlabs_config table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS elevenlabs_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        api_key TEXT NOT NULL,
        voice_id TEXT DEFAULT '9BWtsMINqrJLrRacOk9x',
        model TEXT DEFAULT 'eleven_multilingual_v2',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create workflow_status table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        message TEXT,
        progress INTEGER,
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_google_user_id ON users(google_user_id);
      CREATE INDEX IF NOT EXISTS idx_user_google_tokens_user_id ON user_google_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_google_tokens_google_user_id ON user_google_tokens(google_user_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_status_session_id ON workflow_status(session_id);
    `);

    // Insert default ElevenLabs config if not exists
    await pool.query(`
      INSERT INTO elevenlabs_config (api_key)
      VALUES ('sk_1dd8500bc9503a0f52d07ab4277c7c2c955000f5d4990c73')
      ON CONFLICT DO NOTHING
    `);

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}

// Initialize database on startup
initializeDatabase();

// Debug: Log environment variables on startup
console.log("Environment variables check on startup:");
console.log("GOOGLE_CLIENT_ID:", GOOGLE_CLIENT_ID ? "SET" : "NOT SET");
console.log("GOOGLE_CLIENT_SECRET:", GOOGLE_CLIENT_SECRET ? "SET" : "NOT SET");
console.log("REDIRECT_URI:", REDIRECT_URI ? "SET" : "NOT SET");
console.log("N8N_BASE_URL:", N8N_BASE_URL);
console.log("N8N_WORKFLOW_ID:", N8N_WORKFLOW_ID);

// Helper to create or update n8n credentials for a user/service
async function createOrUpdateN8nCredential(
  userId,
  serviceType,
  serviceTokenData
) {
  const N8N_API_KEY = process.env.N8N_API_KEY;
  const N8N_REST_URL = `${N8N_BASE_URL}/api/v1`;

  try {
    // Create credential with proper data structure
    const res = await fetch(`${N8N_REST_URL}/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": N8N_API_KEY,
      },
      body: JSON.stringify({
        name: `${serviceType}-user-${userId}`,
        type: serviceType,
        data: {
          clientId: serviceTokenData.clientId,
          clientSecret: serviceTokenData.clientSecret,
          accessToken: serviceTokenData.accessToken,
          refreshToken: serviceTokenData.refreshToken,
          scope: serviceTokenData.scope,
          tokenType: serviceTokenData.tokenType,
          expiry_date: serviceTokenData.expiry_date,
        },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(
        `Failed to create n8n credential for ${serviceType}:`,
        errorText
      );
      throw new Error(errorText);
    }

    const { id } = await res.json();
    console.log(
      `Created n8n credential for user ${userId} (${serviceType}): ${id}`
    );
    return id;
  } catch (error) {
    console.error(`Error creating credential for ${serviceType}:`, error);
    throw error;
  }
}

// Function to update workflow with multiple credentials
async function updateWorkflowWithCredentials(credentials, userId) {
  try {
    const N8N_API_KEY = process.env.N8N_API_KEY;

    if (!N8N_API_KEY) {
      console.warn("N8N_API_KEY not configured");
      return false;
    }

    // Update the workflow to use all the credentials
    const workflowUpdateRes = await fetch(
      `${N8N_REST_URL}/workflows/${N8N_WORKFLOW_ID}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-N8N-API-KEY": N8N_API_KEY,
        },
        body: JSON.stringify({
          credentials: credentials,
        }),
      }
    );

    if (!workflowUpdateRes.ok) {
      const errorText = await workflowUpdateRes.text();
      console.error("Failed to update workflow with credentials:", errorText);
      return false;
    }

    console.log(`Updated workflow with credentials for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Error updating workflow:", error);
    return false;
  }
}

// Google OAuth endpoint
app.post("/google-oauth", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    // Get environment variables
    const N8N_API_KEY = process.env.N8N_API_KEY;

    // Debug: Log environment variables
    console.log("Environment variables check:");
    console.log("GOOGLE_CLIENT_ID:", GOOGLE_CLIENT_ID ? "SET" : "NOT SET");
    console.log(
      "GOOGLE_CLIENT_SECRET:",
      GOOGLE_CLIENT_SECRET ? "SET" : "NOT SET"
    );
    console.log("REDIRECT_URI:", REDIRECT_URI ? "SET" : "NOT SET");

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !REDIRECT_URI) {
      return res
        .status(500)
        .json({ error: "Missing Google OAuth configuration" });
    }

    // Step 1: Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Google token exchange failed:", errorData);
      return res.status(400).json({
        error: "Failed to exchange authorization code for tokens",
        details: errorData,
      });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, token_type, scope } =
      tokenData;

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + expires_in);

    // Step 2: Get user info from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      return res
        .status(400)
        .json({ error: "Failed to get user info from Google" });
    }

    const userInfo = await userInfoResponse.json();
    const { id: google_user_id, email, name, picture } = userInfo;

    // Step 3: Store user and tokens in database
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Insert or update user
      const userResult = await client.query(
        `INSERT INTO users (google_user_id, email, name, avatar_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (google_user_id)
         DO UPDATE SET
           email = EXCLUDED.email,
           name = EXCLUDED.name,
           avatar_url = EXCLUDED.avatar_url,
           updated_at = NOW()
         RETURNING id`,
        [google_user_id, email, name, picture]
      );

      const userId = userResult.rows[0].id;

      // Insert or update tokens
      await client.query(
        `INSERT INTO user_google_tokens
         (user_id, google_user_id, access_token, refresh_token, token_type, scope, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id)
         DO UPDATE SET
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           token_type = EXCLUDED.token_type,
           scope = EXCLUDED.scope,
           expires_at = EXCLUDED.expires_at,
           updated_at = NOW()`,
        [
          userId,
          google_user_id,
          access_token,
          refresh_token,
          token_type,
          scope,
          expiryDate,
        ]
      );

      await client.query("COMMIT");

      // Also store in memory for quick access
      userTokens.set(google_user_id, {
        access_token,
        refresh_token,
        scope,
        token_type,
        expiry_date: expiryDate.toISOString(),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    // Step 4: Create persistent n8n credentials for the user (Calendar, Gmail, Contacts)
    let calendarCredId, gmailCredId, contactsCredId;
    if (N8N_BASE_URL) {
      try {
        const baseCredData = {
          clientId: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          accessToken: access_token,
          refreshToken: refresh_token,
          scope: scope,
          tokenType: token_type,
          expiry_date: expiryDate.toISOString(),
        };
        calendarCredId = await createOrUpdateN8nCredential(
          google_user_id,
          "googleCalendarOAuth2Api",
          baseCredData
        );
        gmailCredId = await createOrUpdateN8nCredential(
          google_user_id,
          "googleGmailOAuth2Api",
          baseCredData
        );
        contactsCredId = await createOrUpdateN8nCredential(
          google_user_id,
          "googleContactsOAuth2Api",
          baseCredData
        );
        // Store all credential IDs in your DB
        await pool.query(
          `UPDATE user_google_tokens
           SET n8n_calendar_credential_id = $1,
               n8n_gmail_credential_id = $2,
               n8n_contacts_credential_id = $3
           WHERE google_user_id = $4`,
          [calendarCredId, gmailCredId, contactsCredId, google_user_id]
        );
        // Skip workflow update - credentials will be used by sub-workflows
        console.log(
          "Skipping workflow update - credentials will be used by sub-workflows"
        );
      } catch (error) {
        console.warn(
          "Error creating n8n credentials or patching workflow:",
          error
        );
      }
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: google_user_id,
        email,
        name,
        avatar_url: picture,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return success response
    res.json({
      success: true,
      message: "Google Calendar connected successfully",
      userId: google_user_id,
      email,
      name,
      avatar_url: picture,
      access_token,
      refresh_token,
      scope,
      token_type,
      expires_at: expiryDate.toISOString(),
      jwt_token: jwtToken,
    });
  } catch (error) {
    console.error("Error in google-oauth:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Chat endpoint that handles user-specific n8n calls
app.post("/chat", async (req, res) => {
  try {
    const { text, googleUserId } = req.body;

    if (!text) {
      return res.status(400).json({
        error: "Missing required field: text",
      });
    }

    if (!googleUserId) {
      return res.status(400).json({
        error:
          "Missing required field: googleUserId. Please connect your Google account first.",
      });
    }

    // Check if user has Google tokens
    const tokenResult = await pool.query(
      `SELECT access_token, refresh_token, scope, token_type, expires_at FROM user_google_tokens WHERE google_user_id = $1`,
      [googleUserId]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        error:
          "No Google tokens found for user. Please reconnect your Google account.",
      });
    }

    const tokens = tokenResult.rows[0];
    const googleTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expires_at: tokens.expires_at,
      client_id: process.env.GOOGLE_CLIENT_ID, // Add the app's client ID
    };

    // Call the new streaming agent API endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for streaming

    try {
      const sessionId = `user-${googleUserId}`;
      const assistantResponse = await fetch(
        `http://localhost:3060/api/chat/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            sessionId: sessionId,
            creds: {
              access_token: googleTokens.access_token,
              refresh_token: googleTokens.refresh_token,
              expires_at: googleTokens.expires_at,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!assistantResponse.ok) {
        console.error(
          "Assistant request failed:",
          assistantResponse.status,
          await assistantResponse.text()
        );
        return res.status(500).json({
          error: "Failed to process message with assistant",
        });
      }

      // Handle streaming response
      if (!assistantResponse.ok) {
        throw new Error(`HTTP error! status: ${assistantResponse.status}`);
      }

      const reader = assistantResponse.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let finalMessage = "";
      let isComplete = false;

      // Set up streaming response headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case "thinking":
                  res.write(
                    `data: ${JSON.stringify({
                      type: "thinking",
                      timestamp: new Date().toISOString(),
                    })}\n\n`
                  );
                  break;

                case "status":
                  console.log("📊 Status update:", data.content);
                  res.write(
                    `data: ${JSON.stringify({
                      type: "status",
                      content: data.content,
                      timestamp: new Date().toISOString(),
                    })}\n\n`
                  );
                  break;

                case "progress":
                  console.log("📊 Progress update:", data.content);
                  res.write(
                    `data: ${JSON.stringify({
                      type: "progress",
                      content: data.content,
                      data: data.data,
                      timestamp: new Date().toISOString(),
                    })}\n\n`
                  );
                  break;

                case "response":
                  console.log("💬 Agent response:", data.content);
                  finalMessage = data.content;
                  res.write(
                    `data: ${JSON.stringify({
                      type: "response",
                      content: data.content,
                      alternatives: data.alternatives,
                      conflict: data.conflict,
                      timestamp: new Date().toISOString(),
                    })}\n\n`
                  );
                  break;

                case "complete":
                  console.log("✅ Agent finished processing");
                  isComplete = true;
                  res.write(
                    `data: ${JSON.stringify({
                      type: "complete",
                      timestamp: new Date().toISOString(),
                    })}\n\n`
                  );
                  break;

                case "error":
                  console.log("❌ Error:", data.content);
                  res.write(
                    `data: ${JSON.stringify({
                      type: "error",
                      content: data.content,
                      timestamp: new Date().toISOString(),
                    })}\n\n`
                  );
                  break;
              }
            } catch (e) {
              console.log("Raw SSE data:", line);
            }
          }
        }
      }

      // Log the chat interaction
      await pool.query(
        `INSERT INTO ai_chat_logs (user_question, ai_response, user_agent, user_ip)
       VALUES ($1, $2, $3, $4)`,
        [
          text,
          finalMessage || "No response message found",
          req.headers["user-agent"],
          req.ip,
        ]
      );

      // Send final response for compatibility with React app
      res.write(
        `data: ${JSON.stringify({
          type: "final",
          output: finalMessage || "No response message found",
          text: finalMessage || "No response message found",
        })}\n\n`
      );

      res.end();
      return;
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === "AbortError") {
        console.error("Assistant request timed out after 30 seconds");
        return res.status(504).json({
          error:
            "Assistant service is taking too long to respond. Please try again.",
        });
      }

      console.error("Error calling assistant endpoint:", fetchError);
      return res.status(500).json({
        error: "Failed to communicate with assistant service",
      });
    }
  } catch (error) {
    console.error("Error in /chat endpoint:", error);
    res.status(500).json({
      error: "Internal server error processing chat request",
    });
  }
});

// TTS endpoint (replaces Supabase edge function)
app.post("/tts", async (req, res) => {
  try {
    const { text, voice = "nova" } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    // Get ElevenLabs config from database
    const configResult = await pool.query(
      `SELECT api_key, voice_id, model FROM elevenlabs_config ORDER BY created_at DESC LIMIT 1`
    );

    if (configResult.rows.length === 0) {
      return res
        .status(500)
        .json({ error: "ElevenLabs configuration not found" });
    }

    const config = configResult.rows[0];

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${config.voice_id}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": config.api_key,
        },
        body: JSON.stringify({
          text,
          model_id: config.model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      return res
        .status(response.status)
        .json({ error: "TTS generation failed" });
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    res.json({
      audioContent: base64Audio,
      success: true,
    });
  } catch (error) {
    console.error("TTS error:", error);
    res.status(500).json({ error: "TTS generation failed" });
  }
});

// Streaming TTS endpoint
app.post("/tts-stream", async (req, res) => {
  try {
    const {
      text,
      voice = "nova",
      instructions,
      response_format = "mp3",
    } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    // Get ElevenLabs config from database
    const configResult = await pool.query(
      `SELECT api_key, voice_id, model FROM elevenlabs_config ORDER BY created_at DESC LIMIT 1`
    );

    if (configResult.rows.length === 0) {
      return res
        .status(500)
        .json({ error: "ElevenLabs configuration not found" });
    }

    const config = configResult.rows[0];

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${config.voice_id}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": config.api_key,
        },
        body: JSON.stringify({
          text,
          model_id: config.model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      return res
        .status(response.status)
        .json({ error: "TTS generation failed" });
    }

    // Set response headers for streaming
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Transfer-Encoding", "chunked");

    // Pipe the audio stream directly to response
    response.body.pipe(res);
  } catch (error) {
    console.error("Streaming TTS error:", error);
    res.status(500).json({ error: "TTS generation failed" });
  }
});

// WebSocket endpoint for real-time features
wss.on("connection", (ws, req) => {
  const connectionId = crypto.randomUUID();
  websocketConnections.set(connectionId, ws);

  console.log(`WebSocket connected: ${connectionId}`);

  // Send connection confirmation
  ws.send(
    JSON.stringify({
      type: "connected",
      connectionId: connectionId,
    })
  );

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log("Received WebSocket message:", message);

      if (message.type === "message") {
        // Process the message with n8n workflow
        await processWithN8nWorkflow(ws, message.message, message.userId);
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Error processing your request",
        })
      );
    }
  });

  ws.on("close", () => {
    console.log(`WebSocket disconnected: ${connectionId}`);
    websocketConnections.delete(connectionId);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    websocketConnections.delete(connectionId);
  });
});

// Helper function to process messages with n8n
async function processWithN8nWorkflow(ws, message, userId) {
  try {
    // Get user tokens
    const tokenResult = await pool.query(
      `SELECT * FROM user_google_tokens WHERE google_user_id = $1`,
      [userId]
    );

    if (tokenResult.rows.length === 0) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "No Google tokens found for user",
        })
      );
      return;
    }

    const tokens = tokenResult.rows[0];

    // Prepare Google tokens for the assistant
    const googleTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expires_at: tokens.expires_at,
      client_id: process.env.GOOGLE_CLIENT_ID, // Add the app's client ID
    };

    // Call the new streaming agent API endpoint
    const sessionId = `user-${userId}`;
    const assistantResponse = await fetch(
      `http://localhost:3060/api/chat/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          sessionId: sessionId,
          creds: {
            access_token: googleTokens.access_token,
            refresh_token: googleTokens.refresh_token,
            expires_at: googleTokens.expires_at,
          },
        }),
      }
    );

    if (!assistantResponse.ok) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Failed to process message with agent",
        })
      );
      return;
    }

    const reader = assistantResponse.body?.getReader();
    if (!reader) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "No response body from agent",
        })
      );
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let finalMessage = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case "thinking":
                ws.send(
                  JSON.stringify({
                    type: "thinking",
                    timestamp: new Date().toISOString(),
                  })
                );
                break;

              case "status":
                ws.send(
                  JSON.stringify({
                    type: "status",
                    content: data.content,
                    timestamp: new Date().toISOString(),
                  })
                );
                break;

              case "progress":
                ws.send(
                  JSON.stringify({
                    type: "progress",
                    content: data.content,
                    data: data.data,
                    timestamp: new Date().toISOString(),
                  })
                );
                break;

              case "response":
                finalMessage = data.content;
                ws.send(
                  JSON.stringify({
                    type: "response",
                    data: {
                      message: data.content,
                      alternatives: data.alternatives,
                      conflict: data.conflict,
                      timestamp: new Date().toISOString(),
                    },
                  })
                );
                break;

              case "complete":
                ws.send(
                  JSON.stringify({
                    type: "complete",
                    timestamp: new Date().toISOString(),
                  })
                );
                break;

              case "error":
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: data.content,
                    timestamp: new Date().toISOString(),
                  })
                );
                break;
            }
          } catch (e) {
            console.log("Raw SSE data:", line);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing WebSocket message with n8n:", error);
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Error processing your request",
      })
    );
  }
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// Test endpoint to generate a JWT token for testing
app.post("/test-token", (req, res) => {
  const testUserId = "109405718056319380950"; // Use the user ID from your logs
  const jwtToken = jwt.sign(
    {
      userId: testUserId,
      email: "test@example.com",
      name: "Test User",
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    jwt_token: jwtToken,
    user_id: testUserId,
  });
});

// Get ElevenLabs config endpoint
app.get("/config/elevenlabs", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT api_key, voice_id, model FROM elevenlabs_config ORDER BY created_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "ElevenLabs configuration not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching ElevenLabs config:", error);
    res.status(500).json({ error: "Failed to fetch configuration" });
  }
});

// Update ElevenLabs config endpoint
app.put("/config/elevenlabs", async (req, res) => {
  try {
    const { api_key, voice_id, model } = req.body;

    if (!api_key) {
      return res.status(400).json({ error: "API key is required" });
    }

    await pool.query(
      `INSERT INTO elevenlabs_config (api_key, voice_id, model)
       VALUES ($1, $2, $3)`,
      [
        api_key,
        voice_id || "9BWtsMINqrJLrRacOk9x",
        model || "eleven_multilingual_v2",
      ]
    );

    res.json({ success: true, message: "Configuration updated" });
  } catch (error) {
    console.error("Error updating ElevenLabs config:", error);
    res.status(500).json({ error: "Failed to update configuration" });
  }
});

// Get chat logs endpoint
app.get("/chat-logs", authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT * FROM ai_chat_logs
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching chat logs:", error);
    res.status(500).json({ error: "Failed to fetch chat logs" });
  }
});

// Get workflow status endpoint
app.get("/workflow-status/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await pool.query(
      `SELECT * FROM workflow_status
       WHERE session_id = $1
       ORDER BY created_at DESC`,
      [sessionId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching workflow status:", error);
    res.status(500).json({ error: "Failed to fetch workflow status" });
  }
});

// Update workflow status endpoint
app.post("/workflow-status", async (req, res) => {
  try {
    const { session_id, type, message, progress, data } = req.body;

    if (!session_id || !type) {
      return res
        .status(400)
        .json({ error: "Session ID and type are required" });
    }

    await pool.query(
      `INSERT INTO workflow_status (session_id, type, message, progress, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [session_id, type, message, progress, data]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating workflow status:", error);
    res.status(500).json({ error: "Failed to update workflow status" });
  }
});

// Cleanup old workflow status entries (run periodically)
async function cleanupOldWorkflowStatus() {
  try {
    await pool.query(
      `DELETE FROM workflow_status
       WHERE created_at < NOW() - INTERVAL '24 hours'`
    );
    console.log("Cleaned up old workflow status entries");
  } catch (error) {
    console.error("Error cleaning up workflow status:", error);
  }
}

// Run cleanup every hour
setInterval(cleanupOldWorkflowStatus, 60 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
