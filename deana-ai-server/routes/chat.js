import express from "express";
import { pool } from "../config/database.js";
import { config } from "../config/environment.js";
import rateLimit from "express-rate-limit";
import { z } from "zod";

const router = express.Router();

// In-memory cache for user data and tokens
const userCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minute buffer before token expiry

// Rate limiting for /chat
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 chat requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

const ChatSchema = z.object({
  text: z.string().min(1).max(8000),
  googleUserId: z.string().min(5).max(128),
  sessionId: z.string().min(8).max(256).optional(),
  secondaryGoogleUserId: z.string().min(5).max(128).optional(),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/)
    .optional(),
  timezone: z.string().min(1).max(64).optional(), // optionally add IANA validation
  clientNowISO: z.string().datetime().optional(),
});

// Helper function to check if cached data is still valid
function isCacheValid(cacheEntry) {
  const now = Date.now();

  // Check if cache entry has expired
  if (now > cacheEntry.expiresAt) {
    return false;
  }

  // Check if any Google token is close to expiring (with 5 min buffer)
  if (cacheEntry.earliestTokenExpiry) {
    if (now > cacheEntry.earliestTokenExpiry - TOKEN_EXPIRY_BUFFER_MS) {
      return false;
    }
  }

  return true;
}

// Helper function to get user data (with caching) - now supports dual accounts
async function getUserData(googleUserId) {
  // Check cache first
  const cacheKey = `user_${googleUserId}`;
  const cached = userCache.get(cacheKey);

  if (cached && isCacheValid(cached)) {
    console.log(`📦 Cache hit for user ${googleUserId}`);
    return cached.data;
  }

  console.log(`🔍 Cache miss for user ${googleUserId}, querying database`);

  // Query database for both primary and secondary accounts
  const userDataResult = await pool.query(
    `SELECT
      u.email as primary_user_email,
      u.name as primary_user_name,
      u.avatar_url as primary_user_avatar,
      ugt.account_type,
      ugt.title,
      ugt.email,
      ugt.name,
      ugt.avatar_url,
      ugt.access_token,
      ugt.refresh_token,
      ugt.scope,
      ugt.token_type,
      ugt.expires_at
    FROM users u
    JOIN user_google_tokens ugt ON u.id = ugt.user_id
    WHERE u.google_user_id = $1
    ORDER BY ugt.account_type`,
    [googleUserId]
  );

  if (userDataResult.rows.length === 0) {
    return null;
  }

  // Organize accounts by type
  const userData = {
    user: {
      google_user_id: googleUserId,
      email: userDataResult.rows[0].primary_user_email,
      name: userDataResult.rows[0].primary_user_name,
      avatar_url: userDataResult.rows[0].primary_user_avatar,
    },
    accounts: {
      primary: null,
      secondary: null,
    },
  };

  userDataResult.rows.forEach((row) => {
    userData.accounts[row.account_type] = {
      title: row.title,
      email: row.email,
      name: row.name,
      avatar_url: row.avatar_url,
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      scope: row.scope,
      token_type: row.token_type,
      expires_at: row.expires_at,
    };
  });

  // Cache the result (find earliest expiry time for cache validation)
  let earliestExpiry = null;
  Object.values(userData.accounts).forEach((account) => {
    if (account && account.expires_at) {
      const expiryTime = new Date(account.expires_at).getTime();
      if (!earliestExpiry || expiryTime < earliestExpiry) {
        earliestExpiry = expiryTime;
      }
    }
  });

  userCache.set(cacheKey, {
    data: userData,
    expiresAt: Date.now() + CACHE_TTL_MS,
    earliestTokenExpiry: earliestExpiry,
  });

  console.log(
    `💾 Cached user data for ${googleUserId} with ${
      Object.keys(userData.accounts).filter((k) => userData.accounts[k]).length
    } accounts`
  );
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

router.post("/chat", chatLimiter, async (req, res) => {
  let sseStarted = false;
  try {
    const parsed = ChatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid request", details: parsed.error.flatten() });
    }

    const {
      text,
      googleUserId,
      sessionId: providedSessionId,
      secondaryGoogleUserId,
      phone,
      timezone,
      clientNowISO,
    } = parsed.data;

    // Get user data and Google tokens (with caching)
    const userData = await getUserData(googleUserId);

    if (!userData) {
      return res.status(400).json({
        error: "No user data found. Please connect your Google account.",
      });
    }

    // Check if primary account is connected (required for chat)
    if (!userData.accounts.primary) {
      return res.status(400).json({
        error:
          "Primary Google account is required for chat. Please connect your primary account first.",
      });
    }

    const userEmail = userData.user.email;
    const userName = userData.user.name;
    const primaryAccount = userData.accounts.primary;
    const secondaryAccount = userData.accounts.secondary;

    // Log the accounts being sent to streaming API
    console.log("Chat request - Primary account:", {
      email: primaryAccount.email,
      title: primaryAccount.title,
      has_tokens: !!primaryAccount.access_token,
    });

    if (secondaryAccount) {
      console.log("Chat request - Secondary account:", {
        email: secondaryAccount.email,
        title: secondaryAccount.title,
        has_tokens: !!secondaryAccount.access_token,
      });
    } else {
      console.log("Chat request - No secondary account");
    }

    if (secondaryGoogleUserId) {
      console.log(
        `Secondary Google User ID received: ${secondaryGoogleUserId}`
      );
    }

    // Call the streaming agent API endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    // Abort upstream if client disconnects
    req.on("close", () => {
      try {
        controller.abort();
      } catch {}
    });

    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const sessionId = providedSessionId || `user-${googleUserId}-${today}`;
      const assistantResponse = await fetch(
        `${config.AGENT_BASE_URL}/api/chat/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            sessionId,
            email: userEmail,
            name: userName,
            phone,
            timezone,
            clientNowISO,
            primary_account: {
              email: primaryAccount.email,
              name: primaryAccount.name,
              title: primaryAccount.title,
              creds: {
                access_token: primaryAccount.access_token,
                refresh_token: primaryAccount.refresh_token,
                expires_at: primaryAccount.expires_at,
                client_id: config.GOOGLE_CLIENT_ID,
              },
            },
            secondary_account: secondaryAccount
              ? {
                  email: secondaryAccount.email,
                  title: secondaryAccount.title,
                  creds: {
                    access_token: secondaryAccount.access_token,
                    refresh_token: secondaryAccount.refresh_token,
                    expires_at: secondaryAccount.expires_at,
                    client_id: config.GOOGLE_CLIENT_ID,
                  },
                }
              : null,
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

      // Set up streaming response headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");
      if (typeof res.flushHeaders === "function") {
        res.flushHeaders();
      }
      sseStarted = true;

      const reader = assistantResponse.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let finalMessage = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
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
                res.write(
                  `data: ${JSON.stringify({
                    type: "status",
                    content: data.content,
                    timestamp: new Date().toISOString(),
                  })}\n\n`
                );
                break;
              case "progress":
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
                res.write(
                  `data: ${JSON.stringify({
                    type: "complete",
                    timestamp: new Date().toISOString(),
                  })}\n\n`
                );
                break;
              case "error":
                res.write(
                  `data: ${JSON.stringify({
                    type: "error",
                    content: data.content,
                    timestamp: new Date().toISOString(),
                  })}\n\n`
                );
                break;
            }
          } catch {}
        }
      }

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
      if (sseStarted) {
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            content: "Assistant connection error",
            details: (fetchError && fetchError.message) || "terminated",
            timestamp: new Date().toISOString(),
          })}\n\n`
        );
        try {
          res.end();
        } catch {}
        return;
      }
      if (fetchError.name === "AbortError") {
        return res.status(504).json({ error: "Assistant service timeout" });
      }
      console.error("Error calling assistant endpoint:", fetchError);
      return res
        .status(500)
        .json({ error: "Failed to communicate with assistant service" });
    }
  } catch (error) {
    console.error("Error in /chat endpoint:", error);
    if (res.headersSent) {
      try {
        res.end();
      } catch {}
      return;
    }
    res
      .status(500)
      .json({ error: "Internal server error processing chat request" });
  }
});

// Export cache invalidation function for use in other routes
export { invalidateUserCache };

export default router;
