import { useState, useRef, useCallback, useEffect } from "react";
import {
  BACKEND_TTS_ENDPOINT,
  BACKEND_TTS_STREAM_ENDPOINT,
} from "@/constants/apiConstants";
import { useChatStore } from "../store/chatStore";

interface UseTTSOptions {
  voice?: string;
  streaming?: boolean;
}

export const useTTS = (options: UseTTSOptions = {}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const shouldStopRef = useRef(false);
  const selectedVoice = useChatStore((s) => s.voiceSettings.voice);
  const isMuted = useChatStore((s) => s.isMuted);

  // Preload-and-play queue
  type QueueItem = {
    id: number;
    sentence: string;
    blobUrl?: string;
    ready: boolean;
    error?: string;
    promise: Promise<void>;
  };

  const itemsRef = useRef<QueueItem[]>([]);
  const nextIdRef = useRef(1);
  const playIndexRef = useRef(0);
  const isQueuePlayingRef = useRef(false);

  const stop = useCallback(() => {
    shouldStopRef.current = true;
    // Revoke any preloaded URLs
    for (const it of itemsRef.current) {
      if (it.blobUrl) URL.revokeObjectURL(it.blobUrl);
    }
    itemsRef.current = [];
    playIndexRef.current = 0;
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
      } catch {}
      currentAudioRef.current = null;
    }
    setIsPlaying(false);
    isQueuePlayingRef.current = false;
  }, []);

  // Immediately stop audio when muted is enabled
  useEffect(() => {
    if (isMuted) {
      stop();
    }
  }, [isMuted, stop]);

  const playTTS = useCallback(
    async (
      text: string,
      voice: string = options.voice || selectedVoice || "shimmer"
    ) => {
      if (shouldStopRef.current) {
        shouldStopRef.current = false;
      }

      try {
        setIsPlaying(true);
        setError(null);

        if (options.streaming) {
          // One-shot: fetch and play a single audio clip
          const url = await fetchAudioUrl(text, voice);
          await playAudioUrl(url);
        } else {
          await playStandardTTS(text, voice);
        }
      } catch (err) {
        console.error("TTS error:", err);
        setError(err instanceof Error ? err.message : "TTS failed");
      } finally {
        setIsPlaying(false);
      }
    },
    [options.streaming, options.voice, selectedVoice]
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
        instructions:
          "Speak in a friendly, warm tone suitable for a helpful female assistant.",
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
    await playAudioUrl(audioUrl);
  };

  const fetchAudioUrl = async (
    text: string,
    voice: string
  ): Promise<string> => {
    const response = await fetch(BACKEND_TTS_STREAM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice,
        instructions:
          "Speak in a friendly, warm tone suitable for a helpful female assistant.",
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  };

  const playAudioUrl = async (audioUrl: string): Promise<void> => {
    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;

    await new Promise<void>((resolve) => {
      const cleanup = () => {
        URL.revokeObjectURL(audioUrl);
        if (currentAudioRef.current === audio) currentAudioRef.current = null;
      };
      audio.onended = () => {
        cleanup();
        resolve();
      };
      audio.onerror = () => {
        setError("Audio playback failed");
        cleanup();
        resolve();
      };
      audio.onpause = () => {
        if (shouldStopRef.current) {
          cleanup();
          resolve();
        }
      };
      audio.play().catch(() => {
        setError("Audio playback failed to start");
        cleanup();
        resolve();
      });
    });
  };

  // Preload a sentence and push to queue
  const enqueuePreload = (sentence: string, voice: string) => {
    const id = nextIdRef.current++;
    const item: QueueItem = {
      id,
      sentence,
      ready: false,
      promise: Promise.resolve(), // placeholder overwritten below
    } as QueueItem;
    itemsRef.current.push(item);

    // Start fetch immediately
    item.promise = (async () => {
      try {
        const url = await fetchAudioUrl(sentence, voice);
        if (shouldStopRef.current) {
          URL.revokeObjectURL(url);
          return;
        }
        item.blobUrl = url;
        item.ready = true;
      } catch (err) {
        item.error = err instanceof Error ? err.message : String(err);
        item.ready = false;
      }
    })();
  };

  // Playback loop that consumes items in order, but benefits from preloading
  const runPlayback = async () => {
    if (isQueuePlayingRef.current) return;
    isQueuePlayingRef.current = true;
    setIsPlaying(true);

    try {
      while (!shouldStopRef.current) {
        const idx = playIndexRef.current;
        if (idx >= itemsRef.current.length) break; // wait for more items later

        const item = itemsRef.current[idx];
        // Wait for preload to finish (ready or error)
        try {
          await item.promise;
        } catch {}

        if (shouldStopRef.current) break;

        if (item.error || !item.blobUrl) {
          // Skip on error
          playIndexRef.current = idx + 1;
          continue;
        }

        await playAudioUrl(item.blobUrl);
        // playAudioUrl revokes the URL; clear reference to avoid double revoke
        item.blobUrl = undefined;
        playIndexRef.current = idx + 1;
      }
    } finally {
      isQueuePlayingRef.current = false;
      setIsPlaying(false);
    }
  };

  // Public helper to enqueue sentences for streaming TTS
  const speakSentencesStreaming = useCallback(
    async (fullText: string, voice?: string) => {
      // reset stop flag to allow playback after previous stop
      shouldStopRef.current = false;

      const useVoice = voice || selectedVoice || options.voice || "shimmer";
      // Split on sentence boundaries and paragraphs
      const parts = fullText
        .split(/(?<=[.!?])\s+|\n+/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const s of parts) {
        enqueuePreload(s, useVoice);
      }

      // Kick off playback if not already running
      void runPlayback();
    },
    [options.voice, selectedVoice]
  );

  return {
    playTTS,
    speakSentencesStreaming,
    stop,
    isPlaying,
    error,
  };
};
