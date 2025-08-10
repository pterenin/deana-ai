import express from "express";
import { config } from "../config/environment.js";
import rateLimit from "express-rate-limit";
import { z } from "zod";

const router = express.Router();

function requireApiKey(res) {
  if (!config.OPENAI_API_KEY) {
    res
      .status(500)
      .json({ error: "OPENAI_API_KEY is not configured on the server" });
    return false;
  }
  return true;
}

// Rate limiting for TTS endpoints
const ttsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 TTS requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

const TtsSchema = z.object({
  text: z.string().min(1).max(2000),
  voice: z.string().min(2).max(32).optional(),
});

const TtsStreamSchema = z.object({
  text: z.string().min(1).max(2000),
  voice: z.string().min(2).max(32).optional(),
  response_format: z.enum(["mp3", "opus"]).optional(),
});

// Generate TTS and return base64 JSON (for existing hook compatibility)
router.post("/tts", ttsLimiter, async (req, res) => {
  try {
    if (!requireApiKey(res)) return;

    const parsed = TtsSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid request", details: parsed.error.flatten() });
    }

    const { text, voice = "shimmer" } = parsed.data;

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice,
        input: text,
        format: "mp3",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI TTS error:", response.status, errText);
      return res
        .status(502)
        .json({ error: "TTS provider error", details: errText });
    }

    const arrayBuf = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const base64 = buffer.toString("base64");

    res.json({ audioContent: base64 });
  } catch (err) {
    console.error("/tts error:", err);
    res.status(500).json({ error: "Failed to synthesize speech" });
  }
});

// Generate TTS and stream MP3/OPUS binary with low latency piping
router.post("/tts-stream", ttsLimiter, async (req, res) => {
  try {
    if (!requireApiKey(res)) return;

    const parsed = TtsStreamSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid request", details: parsed.error.flatten() });
    }

    const { text, voice = "shimmer", response_format = "mp3" } = parsed.data;

    const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice,
        input: text,
        format: response_format,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("OpenAI TTS stream error:", upstream.status, errText);
      return res
        .status(502)
        .json({ error: "TTS provider error", details: errText });
    }

    // Stream directly without buffering entire audio
    const contentType =
      response_format === "mp3" ? "audio/mpeg" : "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    const { Readable } = await import("stream");
    const webStream = upstream.body;

    if (typeof webStream?.pipe === "function") {
      webStream.pipe(res);
    } else if (webStream) {
      Readable.fromWeb(webStream).pipe(res);
    } else {
      // Fallback to arrayBuffer (shouldn't happen normally)
      const arrayBuf = await upstream.arrayBuffer();
      res.end(Buffer.from(arrayBuf));
    }
  } catch (err) {
    console.error("/tts-stream error:", err);
    // If headers already sent, end the stream; else send JSON
    if (res.headersSent) {
      try {
        res.end();
      } catch {}
    } else {
      res.status(500).json({ error: "Failed to synthesize speech (stream)" });
    }
  }
});

export default router;
