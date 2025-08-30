import { useState } from "react";
import { BACKEND_TTS_ENDPOINT } from "@/constants/apiConstants";

interface UseVoiceOptions {
  voice?: string;
}

export const useVoice = (options: UseVoiceOptions = {}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speak = async (text: string) => {
    const voice = options.voice || "nova";

    try {
      setIsPlaying(true);
      setError(null);

      // Call our Express server for TTS
      const response = await fetch(BACKEND_TTS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.audioContent) {
        throw new Error("No audio content received");
      }

      // Convert base64 to audio and play
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0))],
        { type: "audio/mpeg" }
      );

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsPlaying(false);
        try {
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
        } catch {}
        queueMicrotask(() => {
          try {
            URL.revokeObjectURL(audioUrl);
          } catch {}
        });
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setError("Audio playback failed");
        try {
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
        } catch {}
        queueMicrotask(() => {
          try {
            URL.revokeObjectURL(audioUrl);
          } catch {}
        });
      };

      await audio.play();
    } catch (err) {
      console.error("Voice error:", err);
      setError(err instanceof Error ? err.message : "Voice failed");
      setIsPlaying(false);
    }
  };

  return {
    speak,
    isPlaying,
    error,
  };
};
