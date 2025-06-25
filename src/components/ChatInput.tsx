
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Mic, MicOff } from 'lucide-react';
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
    <div className="bg-white p-6 border-t">
      <form onSubmit={handleSubmit} className="flex gap-4 items-end max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Ask Anything..."}
            disabled={disabled}
            className={`min-h-[56px] max-h-32 resize-none rounded-3xl border-gray-300 bg-gray-50 focus:border-purple-500 focus:ring-purple-500 px-6 py-4 text-gray-700 placeholder-gray-500 ${
              isListening ? 'border-red-300 bg-red-50' : ''
            }`}
            aria-label="Chat message input"
            rows={1}
          />
          {error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {}}
            disabled={disabled}
            className="rounded-full h-12 w-12 p-0 bg-gray-100 hover:bg-gray-200 text-gray-600"
            aria-label="Attach file"
          >
            <Paperclip size={20} />
          </Button>
          
          <Button
            type="button"
            size="sm"
            onClick={toggleVoiceInput}
            disabled={disabled}
            className={`rounded-full h-12 w-12 p-0 ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </Button>
        </div>
      </form>
    </div>
  );
};
