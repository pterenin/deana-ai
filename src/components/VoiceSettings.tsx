
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useToast } from '@/hooks/use-toast';

export const VoiceSettings: React.FC = () => {
  const { voiceSettings, updateVoiceSettings } = useChatStore();
  const [localSettings, setLocalSettings] = useState(voiceSettings);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    updateVoiceSettings(localSettings);
    setIsOpen(false);
    toast({
      title: "Settings saved",
      description: "Voice settings have been updated successfully.",
    });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Reset local settings to current store values when opening
      setLocalSettings(voiceSettings);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
          <Settings size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Voice Settings</DialogTitle>
          <DialogDescription>
            Configure your voice settings for the AI assistant using OpenAI TTS.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800 font-medium">✓ OpenAI TTS Connected</p>
            <p className="text-xs text-green-600 mt-1">
              Using OpenAI's TTS-1 model with voice: {localSettings.voice || 'nova'}
            </p>
          </div>
          
          <div>
            <Label htmlFor="voice">Voice Selection</Label>
            <select
              id="voice"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={localSettings.voice || 'nova'}
              onChange={(e) => setLocalSettings({ ...localSettings, voice: e.target.value })}
            >
              <option value="alloy">Alloy</option>
              <option value="echo">Echo</option>
              <option value="fable">Fable</option>
              <option value="onyx">Onyx</option>
              <option value="nova">Nova</option>
              <option value="shimmer">Shimmer</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Choose from OpenAI's available TTS voices
            </p>
          </div>
          
          <Button onClick={handleSave} className="w-full">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
