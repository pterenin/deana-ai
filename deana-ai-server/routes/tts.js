import express from "express";
import { generateTTS, generateStreamingTTS } from "../services/ttsService.js";

const router = express.Router();

// TTS endpoint (replaces Supabase edge function)
router.post("/tts", async (req, res) => {
  try {
    const { text, voice = "nova" } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const result = await generateTTS(text, voice);
    res.json(result);
  } catch (error) {
    console.error("TTS error:", error);
    res.status(500).json({ error: "TTS generation failed" });
  }
});

// Streaming TTS endpoint
router.post("/tts-stream", async (req, res) => {
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

    await generateStreamingTTS(res, text, voice);
  } catch (error) {
    console.error("Streaming TTS error:", error);
    res.status(500).json({ error: "TTS generation failed" });
  }
});

export default router;
