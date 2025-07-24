import express from "express";
import { pool } from "../config/database.js";
import { config } from "../config/environment.js";

const router = express.Router();

// In-memory cache for user data and tokens
const userCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minute buffer before token expiry

// Helper function to check if cached data is still valid
function isCacheValid(cacheEntry) {
  const now = Date.now();

  // Check if cache entry has expired
  if (now > cacheEntry.expiresAt) {
    return false;
  }

  // Check if Google token is close to expiring (with 5 min buffer)
  const tokenExpiryTime = new Date(cacheEntry.data.expires_at).getTime();
  if (now > tokenExpiryTime - TOKEN_EXPIRY_BUFFER_MS) {
    return false;
  }

  return true;
}

// Helper function to get user data (with caching)
async function getUserData(googleUserId) {
  // Check cache first
  const cacheKey = `user_${googleUserId}`;
  const cached = userCache.get(cacheKey);

  if (cached && isCacheValid(cached)) {
    console.log(`📦 Cache hit for user ${googleUserId}`);
    return cached.data;
  }

  console.log(`🔍 Cache miss for user ${googleUserId}, querying database`);

  // Query database
  const userDataResult = await pool.query(
    `SELECT
      u.email,
      ugt.access_token,
      ugt.refresh_token,
      ugt.scope,
      ugt.token_type,
      ugt.expires_at
    FROM users u
    JOIN user_google_tokens ugt ON u.google_user_id = ugt.google_user_id
    WHERE u.google_user_id = $1`,
    [googleUserId]
  );

  if (userDataResult.rows.length === 0) {
    return null;
  }

  const userData = userDataResult.rows[0];

  // Cache the result
  userCache.set(cacheKey, {
    data: userData,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  console.log(`💾 Cached user data for ${googleUserId}`);
  return userData;
}

// Helper function to invalidate user cache (call this when user disconnects)
function invalidateUserCache(googleUserId) {
  const cacheKey = `user_${googleUserId}`;
  userCache.delete(cacheKey);
  console.log(`🗑️ Invalidated cache for user ${googleUserId}`);
}

// Cleanup expired cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, entry] of userCache.entries()) {
    if (now > entry.expiresAt) {
      userCache.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned ${cleanedCount} expired cache entries`);
  }
}, 10 * 60 * 1000);

// Cache statistics endpoint for monitoring
router.get("/cache-stats", (req, res) => {
  const now = Date.now();
  let activeEntries = 0;
  let expiredEntries = 0;

  for (const [key, entry] of userCache.entries()) {
    if (now > entry.expiresAt) {
      expiredEntries++;
    } else {
      activeEntries++;
    }
  }

  res.json({
    totalEntries: userCache.size,
    activeEntries,
    expiredEntries,
    cacheHitRatio: "Check server logs for cache hit/miss details",
    cacheTTL: `${CACHE_TTL_MS / 1000 / 60} minutes`,
    tokenExpiryBuffer: `${TOKEN_EXPIRY_BUFFER_MS / 1000 / 60} minutes`,
  });
});

router.post("/chat", async (req, res) => {
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

    // Get user data and Google tokens (with caching)
    const userData = await getUserData(googleUserId);

    if (!userData) {
      return res.status(400).json({
        error:
          "No user data or Google tokens found. Please reconnect your Google account.",
      });
    }
    const userEmail = userData.email;
    const googleTokens = {
      access_token: userData.access_token,
      refresh_token: userData.refresh_token,
      scope: userData.scope,
      token_type: userData.token_type,
      expires_at: userData.expires_at,
      client_id: config.GOOGLE_CLIENT_ID,
    };

    // Call the new streaming agent API endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for streaming

    try {
      const today = new Date().toISOString().split("T")[0]; // Gets YYYY-MM-DD format
      const sessionId = `user-${googleUserId}-${today}`;
      const assistantResponse = await fetch(
        `http://localhost:3060/api/chat/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            sessionId: sessionId,
            email: userEmail,
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

// Export cache invalidation function for use in other routes
export { invalidateUserCache };

export default router;
