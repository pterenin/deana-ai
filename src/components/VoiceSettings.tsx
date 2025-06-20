
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useToast } from '@/hooks/use-toast';

export const VoiceSettings: React.FC = () => {
  const { isMuted, toggleMute } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    setIsOpen(false);
    toast({
      title: "Settings saved",
      description: "Voice settings have been updated successfully.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
          <Settings size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Voice Settings</DialogTitle>
          <DialogDescription>
            Configure your voice settings for the AI assistant. Audio is provided directly from the n8n webhook response.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800 font-medium">✓ Audio Enabled</p>
            <p className="text-xs text-green-600 mt-1">
              Audio responses are played directly from the n8n webhook with fallback to browser speech synthesis
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="mute">Audio Playback</Label>
              <p className="text-sm text-gray-500 mt-1">
                {isMuted ? 'Audio is currently muted' : 'Audio is currently enabled'}
              </p>
            </div>
            <Button 
              variant={isMuted ? "outline" : "default"}
              onClick={toggleMute}
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </Button>
          </div>
          
          <Button onClick={handleSave} className="w-full">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
