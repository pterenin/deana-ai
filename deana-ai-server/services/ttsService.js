import { pool } from "../config/database.js";

// Get ElevenLabs config from database
async function getElevenLabsConfig() {
  const configResult = await pool.query(
    `SELECT api_key, voice_id, model FROM elevenlabs_config ORDER BY created_at DESC LIMIT 1`
  );

  if (configResult.rows.length === 0) {
    throw new Error("ElevenLabs configuration not found");
  }

  return configResult.rows[0];
}

// Standard TTS endpoint
export async function generateTTS(text, voice = "nova") {
  if (!text) {
    throw new Error("Text is required");
  }

  const config = await getElevenLabsConfig();

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
    throw new Error("TTS generation failed");
  }

  const audioBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(audioBuffer).toString("base64");

  return {
    audioContent: base64Audio,
    success: true,
  };
}

// Streaming TTS endpoint
export async function generateStreamingTTS(res, text, voice = "nova") {
  if (!text) {
    throw new Error("Text is required");
  }

  const config = await getElevenLabsConfig();

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
    throw new Error("TTS generation failed");
  }

  // Set response headers for streaming
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Transfer-Encoding", "chunked");

  // Pipe the audio stream directly to response
  response.body.pipe(res);
}
