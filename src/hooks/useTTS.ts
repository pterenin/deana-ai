
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
      console.log('Starting streaming TTS with voice:', voice, 'for text:', text.substring(0, 50));

      // Call our streaming Supabase edge function
      const response = await fetch('/supabase/functions/v1/openai-tts-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice }),
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      // Check if we have a readable stream
      if (!response.body) {
        throw new Error('No response body received');
      }

      console.log('Received streaming response, starting playback...');
      
      // Create a new Response from the stream to get an audio blob
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      
      // Read the stream in chunks
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        if (value) {
          chunks.push(value);
          
          // Start playing as soon as we have some data (first chunk)
          if (chunks.length === 1) {
            console.log('First chunk received, preparing audio...');
          }
        }
      }

      // Combine all chunks into a single blob
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const audioData = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        audioData.set(chunk, offset);
        offset += chunk.length;
      }

      // Create audio blob and play
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      console.log('Audio prepared, starting playback');

      audio.onloadeddata = () => {
        console.log('Audio data loaded, can start playing');
      };

      audio.oncanplay = () => {
        console.log('Audio ready to play');
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

      // Start playing immediately
      await audio.play();
      console.log('Audio playback started');

    } catch (err) {
      console.error('TTS streaming error:', err);
      setIsPlaying(false);
      setError(err instanceof Error ? err.message : 'TTS failed');
      
      // Fallback to browser speech synthesis
      console.log('Falling back to browser TTS...');
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
