import express from "express";
import { pool } from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";
import { generateToken } from "../middleware/auth.js";
import { config } from "../config/environment.js";

const router = express.Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// Test endpoint to generate a JWT token for testing
router.post("/test-token", (req, res) => {
  const testUserId = "109405718056319380950"; // Use the user ID from your logs
  const jwtToken = generateToken({
    userId: testUserId,
    email: "test@example.com",
    name: "Test User",
  });

  res.json({
    jwt_token: jwtToken,
    user_id: testUserId,
  });
});

// Get ElevenLabs config endpoint
router.get("/config/elevenlabs", async (req, res) => {
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
router.put("/config/elevenlabs", async (req, res) => {
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
router.get("/chat-logs", authenticateToken, async (req, res) => {
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
router.get("/workflow-status/:sessionId", async (req, res) => {
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
router.post("/workflow-status", async (req, res) => {
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

export default router;
