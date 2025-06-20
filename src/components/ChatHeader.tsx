
import React from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { VoiceSettings } from './VoiceSettings';

export const ChatHeader: React.FC = () => {
  const { isMuted, toggleMute, clearMessages } = useChatStore();

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Deana AI Assistant</h1>
          <p className="text-sm text-gray-600">Ready to help you with voice and text</p>
        </div>
        
        <div className="flex gap-2">
          <VoiceSettings />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="text-gray-600 hover:text-gray-900"
            aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="text-gray-600 hover:text-gray-900"
            aria-label="Clear chat history"
          >
            <RotateCcw size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};
