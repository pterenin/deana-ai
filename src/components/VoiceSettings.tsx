
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useToast } from '@/hooks/use-toast';

export const VoiceSettings: React.FC = () => {
  const { isMuted, toggleMute, voiceSettings, updateVoiceSettings } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleVoiceChange = (voice: string) => {
    updateVoiceSettings({ voice });
  };

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
            Configure your voice settings for the AI assistant. Audio is generated using OpenAI's TTS API.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800 font-medium">✓ OpenAI TTS Enabled</p>
            <p className="text-xs text-green-600 mt-1">
              High-quality audio responses generated in real-time using OpenAI's text-to-speech API
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="voice-select">Voice</Label>
            <Select value={voiceSettings.voice} onValueChange={handleVoiceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alloy">Alloy</SelectItem>
                <SelectItem value="echo">Echo</SelectItem>
                <SelectItem value="fable">Fable</SelectItem>
                <SelectItem value="onyx">Onyx</SelectItem>
                <SelectItem value="nova">Nova</SelectItem>
                <SelectItem value="shimmer">Shimmer</SelectItem>
              </SelectContent>
            </Select>
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
