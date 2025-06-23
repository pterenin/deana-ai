
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      console.log('Starting TTS playback with voice:', voice, 'for text:', text.substring(0, 50));

      // Call our Supabase edge function using the invoke method
      const { data, error: functionError } = await supabase.functions.invoke('openai-tts-stream', {
        body: { 
          text, 
          voice,
          instructions: "Speak in a cheerful and positive tone."
        },
      });

      if (functionError) {
        throw new Error(`TTS API error: ${functionError.message}`);
      }

      // The response should be audio data
      if (data) {
        // Create audio from the response
        const audioBlob = new Blob([data], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onloadstart = () => {
          console.log('Audio loading started');
        };

        audio.oncanplay = () => {
          console.log('Audio can start playing');
        };

        audio.onended = () => {
          console.log('Audio playback completed');
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = (event) => {
          console.error('Audio playback error:', event);
          setIsPlaying(false);
          setError('Audio playback failed');
          URL.revokeObjectURL(audioUrl);
        };

        // Start playing
        await audio.play();
        console.log('Audio playback started');
      }

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
