
import { useState, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { supabase } from '@/integrations/supabase/client';

export const useTTS = () => {
  const { voiceSettings } = useChatStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<Blob[]>([]);
  const isPlayingQueueRef = useRef(false);

  // Clean text by removing [More Details] links and URLs
  const cleanTextForTTS = (text: string): string => {
    // Remove [More Details](URL) markdown links
    let cleanedText = text.replace(/\[More Details\]\([^)]+\)/g, '');
    
    // Remove any remaining standalone URLs that might be left
    cleanedText = cleanedText.replace(/https?:\/\/[^\s]+/g, '');
    
    // Clean up extra whitespace and line breaks that might be left
    cleanedText = cleanedText.replace(/\n\s*\n/g, '\n').trim();
    
    return cleanedText;
  };

  // Split text into chunks at sentence boundaries
  const splitTextIntoChunks = (text: string, maxChunkLength: number = 200): string[] => {
    // First try to split by sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      // If adding this sentence would exceed max length, start a new chunk
      if (currentChunk.length + trimmedSentence.length > maxChunkLength && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // If no chunks were created (no sentence boundaries), split by length
    if (chunks.length === 0) {
      for (let i = 0; i < text.length; i += maxChunkLength) {
        chunks.push(text.slice(i, i + maxChunkLength));
      }
    }

    return chunks;
  };

  const generateAudioForChunk = async (text: string, voice: string): Promise<Blob> => {
    const response = await fetch('https://pqwrhinsjifmaaziyhqj.supabase.co/functions/v1/openai-tts-stream', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxd3JoaW5zamlmbWFheml5aHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MDkxMzYsImV4cCI6MjA2NDQ4NTEzNn0.58ZzeBUIuWl2DVGpPj1B7EqWpI_GbGyzplNoMCL66ik`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxd3JoaW5zamlmbWFheml5aHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MDkxMzYsImV4cCI6MjA2NDQ4NTEzNn0.58ZzeBUIuWl2DVGpPj1B7EqWpI_GbGyzplNoMCL66ik',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice: voice,
        instructions: "Speak in a cheerful and positive tone.",
        response_format: 'mp3'
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.blob();
  };

  const playNextInQueue = async (): Promise<void> => {
    if (audioQueueRef.current.length === 0 || isPlayingQueueRef.current) {
      return;
    }

    isPlayingQueueRef.current = true;
    const audioBlob = audioQueueRef.current.shift()!;

    return new Promise((resolve, reject) => {
      const audio = new Audio();
      currentAudioRef.current = audio;
      
      audio.onloadstart = () => {
        console.log('Audio chunk loading started');
      };

      audio.oncanplay = () => {
        console.log('Audio chunk can start playing');
      };

      audio.onended = () => {
        console.log('Audio chunk playback completed');
        URL.revokeObjectURL(audio.src);
        isPlayingQueueRef.current = false;
        
        // Check if there are more chunks to play
        if (audioQueueRef.current.length > 0) {
          playNextInQueue();
        } else {
          setIsPlaying(false);
          currentAudioRef.current = null;
        }
        resolve();
      };

      audio.onerror = (event) => {
        console.error('Audio chunk playback error:', event);
        URL.revokeObjectURL(audio.src);
        isPlayingQueueRef.current = false;
        reject(new Error('Audio playback failed'));
      };

      audio.src = URL.createObjectURL(audioBlob);
      audio.play().catch(reject);
    });
  };

  const playTTS = async (text: string, overrideVoice?: string) => {
    try {
      setIsPlaying(true);
      setError(null);

      // Clean the text before processing
      const cleanedText = cleanTextForTTS(text);
      console.log('Original text:', text.substring(0, 100));
      console.log('Cleaned text:', cleanedText.substring(0, 100));

      const voice = overrideVoice || voiceSettings.voice || 'nova';
      console.log('Starting chunked TTS playback with voice:', voice, 'for cleaned text:', cleanedText.substring(0, 50));

      // Split cleaned text into chunks for faster initial playback
      const chunks = splitTextIntoChunks(cleanedText);
      console.log('Split text into', chunks.length, 'chunks');

      // Clear any existing queue
      audioQueueRef.current = [];
      isPlayingQueueRef.current = false;

      // Generate and queue audio chunks
      chunks.forEach(async (chunk, index) => {
        try {
          console.log(`Generating audio for chunk ${index + 1}/${chunks.length}`);
          const audioBlob = await generateAudioForChunk(chunk, voice);
          console.log(`Chunk ${index + 1} audio ready, size:`, audioBlob.size);
          
          // Add to queue
          audioQueueRef.current.push(audioBlob);
          
          // If this is the first chunk and nothing is playing yet, start playing
          if (index === 0 && !isPlayingQueueRef.current) {
            console.log('Starting playback with first chunk');
            playNextInQueue();
          }
        } catch (chunkError) {
          console.error(`Error with chunk ${index + 1}:`, chunkError);
          // Continue with other chunks instead of failing completely
        }
      });

    } catch (err) {
      console.error('TTS error:', err);
      setIsPlaying(false);
      setError(err instanceof Error ? err.message : 'TTS failed');
      
      // Fallback to browser speech synthesis with cleaned text
      const cleanedText = cleanTextForTTS(text);
      const utterance = new SpeechSynthesisUtterance(cleanedText);
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
    // Clear the queue
    audioQueueRef.current = [];
    isPlayingQueueRef.current = false;
    
    // Stop current audio if playing
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    // Stop speech synthesis
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
