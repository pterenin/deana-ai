
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseVoiceOptions {
  voice?: string;
}

export const useVoice = (options: UseVoiceOptions = {}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speak = async (text: string) => {
    const voice = options.voice || 'nova';

    try {
      setIsPlaying(true);
      setError(null);

      // Call our Supabase edge function for OpenAI TTS
      const { data, error: functionError } = await supabase.functions.invoke('openai-tts', {
        body: {
          text,
          voice,
        },
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!data?.audioContent) {
        throw new Error('No audio content received');
      }

      // Convert base64 to audio and play
      const audioBlob = new Blob([
        Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))
      ], { type: 'audio/mpeg' });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        setError('Audio playback failed');
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (err) {
      setIsPlaying(false);
      setError(err instanceof Error ? err.message : 'Voice synthesis failed');
      console.error('OpenAI TTS error:', err);
      
      // Fallback to browser speech synthesis
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 0.95;
      utterance.volume = 0.9;
      
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Neural') || 
        voice.name.includes('Enhanced') ||
        voice.name.includes('Premium')
      ) || voices.find(voice => voice.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

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
    speak,
    stop,
    isPlaying,
    error,
  };
};
