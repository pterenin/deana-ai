
import { useState } from 'react';
import { useChatStore } from '../store/chatStore';

export const useTTS = () => {
  const { voiceSettings } = useChatStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playTTS = async (text: string, overrideVoice?: string) => {
    try {
      setIsPlaying(true);
      setError(null);

      const voice = overrideVoice || voiceSettings.voice || 'nova';
      const format = 'mp3'; // Using mp3 for better compatibility
      console.log('Starting streaming TTS playback with voice:', voice, 'for text:', text.substring(0, 50));

      // 1) Kick off the fetch to your Supabase edge function
      const res = await fetch(
        'https://pqwrhinsjifmaaziyhqj.supabase.co/functions/v1/openai-tts-stream',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxd3JoaW5zamlmbWFheml5aHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MDkxMzYsImV4cCI6MjA2NDQ4NTEzNn0.58ZzeBUIuWl2DVGpPj1B7EqWpI_GbGyzplNoMCL66ik`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxd3JoaW5zamlmbWFheml5aHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MDkxMzYsImV4cCI6MjA2NDQ4NTEzNn0.58ZzeBUIuWl2DVGpPj1B7EqWpI_GbGyzplNoMCL66ik'
          },
          body: JSON.stringify({ 
            text, 
            voice,
            instructions: "Speak in a cheerful and positive tone.",
            response_format: format
          })
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error('TTS API error:', err);
        throw new Error(`TTS request failed: ${res.status} ${err}`);
      }

      console.log('TTS response received, setting up streaming playback');

      // 2) Create an <audio> hooked up to a MediaSource for streaming
      const mediaSource = new MediaSource();
      const audio = new Audio(URL.createObjectURL(mediaSource));
      
      // Set up audio event listeners
      audio.onloadstart = () => {
        console.log('Audio loading started');
      };

      audio.oncanplay = () => {
        console.log('Audio can start playing');
      };

      audio.onended = () => {
        console.log('Audio playback completed');
        setIsPlaying(false);
        URL.revokeObjectURL(audio.src);
      };

      audio.onerror = (event) => {
        console.error('Audio playback error:', event);
        setIsPlaying(false);
        setError('Audio playback failed');
        URL.revokeObjectURL(audio.src);
      };

      // Prime playback
      audio.play().catch(() => {});

      mediaSource.addEventListener('sourceopen', async () => {
        try {
          // 3) Add a SourceBuffer matching the MIME type
          const mimeType = format === 'mp3'
            ? 'audio/mpeg'
            : format === 'opus'
            ? 'audio/opus'
            : format === 'aac'
            ? 'audio/aac'
            : 'audio/mpeg';
          
          const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
          console.log('SourceBuffer created with MIME type:', mimeType);

          // 4) Stream the response body into the buffer
          const reader = res.body?.getReader();
          if (!reader) {
            throw new Error('No response body reader available');
          }

          const pump = async () => {
            try {
              const { done, value } = await reader.read();
              if (done) {
                console.log('Streaming completed, ending MediaSource');
                mediaSource.endOfStream();
                return;
              }
              
              // appendBuffer must wait until the buffer is free
              await new Promise<void>((resolve) => {
                sourceBuffer.addEventListener('updateend', () => resolve(), { once: true });
                sourceBuffer.appendBuffer(value);
              });
              
              // Continue pumping
              pump();
            } catch (pumpError) {
              console.error('Error during streaming pump:', pumpError);
              setIsPlaying(false);
              setError('Streaming playback failed');
            }
          };
          
          pump();
        } catch (sourceError) {
          console.error('Error setting up MediaSource:', sourceError);
          setIsPlaying(false);
          setError('Failed to setup streaming playback');
        }
      });

    } catch (err) {
      console.error('TTS error:', err);
      setIsPlaying(false);
      setError(err instanceof Error ? err.message : 'TTS failed');
      
      // Fallback to browser speech synthesis
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => {
        setIsPlaying(false);
        setError('Speech synthesis failed');
      };
      
      speechSynthesis.speak(utterance);
    }
  };

  const stop = () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
  };

  return {
    playTTS,
    stop,
    isPlaying,
    error,
  };
};
