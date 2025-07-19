import express from "express";
import { pool } from "../config/database.js";
import { config } from "../config/environment.js";

const router = express.Router();

// Chat endpoint that handles user-specific n8n calls
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
      client_id: config.GOOGLE_CLIENT_ID,
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

export default router;
