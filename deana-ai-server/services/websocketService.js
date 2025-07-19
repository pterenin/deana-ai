import { pool } from "../config/database.js";
import { config } from "../config/environment.js";
import crypto from "crypto";

// In-memory storage for WebSocket connections
export const websocketConnections = new Map();

// Helper function to process messages with n8n
export async function processWithN8nWorkflow(ws, message, userId) {
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
      client_id: config.GOOGLE_CLIENT_ID,
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

// WebSocket connection handler
export function handleWebSocketConnection(ws, req) {
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
}
