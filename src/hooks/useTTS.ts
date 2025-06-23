
import { useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { supabase } from '@/integrations/supabase/client';

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

      // Use the Supabase edge function which has access to the OpenAI API key
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/openai-tts-stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'apikey': supabase.supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `Speak in a cheerful and positive tone. ${text}`,
          voice: voice,
          response_format: 'mp3',
          instructions: 'Speak in a cheerful and positive tone.'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('TTS response received from Supabase edge function');

      // Get the response as a blob since it's binary audio data
      const audioBlob = await response.blob();
      console.log('Audio blob created, size:', audioBlob.size);

      // Create audio element and play the response
      const audio = new Audio();
      
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

      // Create object URL from the blob
      audio.src = URL.createObjectURL(audioBlob);
      console.log('Audio src set, starting playback');

      // Start playback
      await audio.play();

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
