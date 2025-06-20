
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp, Mic, MicOff } from 'lucide-react';
import { useSpeechToText } from '../hooks/useSpeechToText';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled = false }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isListening, transcript, error, startListening, stopListening, clearTranscript } = useSpeechToText();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input.trim());
      setInput('');
      clearTranscript();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Update input with transcript
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div className="border-t bg-white p-4">
      <form onSubmit={handleSubmit} className="flex gap-3 items-end max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Type your message or use voice input..."}
            disabled={disabled}
            className={`min-h-[44px] max-h-32 resize-none pr-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${
              isListening ? 'border-red-300 bg-red-50' : ''
            }`}
            aria-label="Chat message input"
            rows={1}
          />
          {error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          onClick={toggleVoiceInput}
          disabled={disabled}
          className={`rounded-xl h-11 w-11 p-0 ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-gray-500 hover:bg-gray-600'
          }`}
          aria-label={isListening ? "Stop voice input" : "Start voice input"}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!input.trim() || disabled}
          className="rounded-xl h-11 w-11 p-0 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300"
          aria-label="Send message"
        >
          <ArrowUp size={20} />
        </Button>
      </form>
    </div>
  );
};
