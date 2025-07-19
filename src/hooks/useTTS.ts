import { useState, useRef, useCallback } from "react";
import {
  BACKEND_TTS_ENDPOINT,
  BACKEND_TTS_STREAM_ENDPOINT,
} from "@/constants/apiConstants";

interface UseTTSOptions {
  voice?: string;
  streaming?: boolean;
}

export const useTTS = (options: UseTTSOptions = {}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const shouldStopRef = useRef(false);

  const stop = useCallback(() => {
    shouldStopRef.current = true;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playTTS = useCallback(
    async (text: string, voice: string = "nova") => {
      if (shouldStopRef.current) {
        shouldStopRef.current = false;
      }

      try {
        setIsPlaying(true);
        setError(null);

        if (options.streaming) {
          await playStreamingTTS(text, voice);
        } else {
          await playStandardTTS(text, voice);
        }
      } catch (err) {
        console.error("TTS error:", err);
        setError(err instanceof Error ? err.message : "TTS failed");
        setIsPlaying(false);
      }
    },
    [options.streaming]
  );

  const playStandardTTS = async (
    text: string,
    voice: string
  ): Promise<void> => {
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

    currentAudioRef.current = audio;

    audio.onended = () => {
      setIsPlaying(false);
      URL.revokeObjectURL(audioUrl);
      currentAudioRef.current = null;
    };

    audio.onerror = () => {
      setIsPlaying(false);
      setError("Audio playback failed");
      URL.revokeObjectURL(audioUrl);
      currentAudioRef.current = null;
    };

    await audio.play();
  };

  const playStreamingTTS = async (
    text: string,
    voice: string
  ): Promise<void> => {
    const response = await fetch(BACKEND_TTS_STREAM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice,
        instructions: "Speak in a cheerful and positive tone.",
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    currentAudioRef.current = audio;

    audio.onended = () => {
      setIsPlaying(false);
      URL.revokeObjectURL(audioUrl);
      currentAudioRef.current = null;
    };

    audio.onerror = () => {
      setIsPlaying(false);
      setError("Audio playback failed");
      URL.revokeObjectURL(audioUrl);
      currentAudioRef.current = null;
    };

    await audio.play();
  };

  return {
    playTTS,
    stop,
    isPlaying,
    error,
  };
};
