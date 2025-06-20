
import { useState, useRef, useCallback } from 'react';

interface UseSpeechToTextOptions {
  language?: string;
  continuous?: boolean;
}

export const useSpeechToText = (options: UseSpeechToTextOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef(''); // Store accumulated final transcript

  const startListening = useCallback(async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    try {
      // Clear transcript when starting to listen
      setTranscript('');
      finalTranscriptRef.current = '';
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = options.continuous ?? true;
      recognition.interimResults = true;
      recognition.lang = options.language || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        console.log('Speech recognition started');
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            // Accumulate final results instead of replacing
            finalTranscriptRef.current += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Combine accumulated final transcript with current interim transcript
        const fullTranscript = finalTranscriptRef.current + interimTranscript;
        setTranscript(fullTranscript);
      };

      recognition.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        console.error('Speech recognition error:', event.error);
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log('Speech recognition ended');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setError('Microphone access denied');
      setIsListening(false);
    }
  }, [options.continuous, options.language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    finalTranscriptRef.current = ''; // Clear accumulated transcript
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    clearTranscript,
  };
};
