
import React from 'react';
import { AlertCircle, Shield, Mic, Globe, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SpeechHelpProps {
  error: string | null;
  permissionStatus: {
    granted: boolean;
    error: string | null;
    isHttps: boolean;
    browserSupported: boolean;
  };
  onRetry: () => void;
  className?: string;
}

export const SpeechHelp: React.FC<SpeechHelpProps> = ({ 
  error, 
  permissionStatus, 
  onRetry, 
  className = "" 
}) => {
  if (!error && permissionStatus.granted) {
    return null;
  }

  const getHelpContent = () => {
    if (!permissionStatus.isHttps) {
      return {
        icon: <Shield className="h-4 w-4" />,
        title: "HTTPS Required",
        description: "Speech recognition requires a secure connection (HTTPS). Please access the site via HTTPS to use voice input.",
        showRetry: false
      };
    }

    if (!permissionStatus.browserSupported) {
      return {
        icon: <Globe className="h-4 w-4" />,
        title: "Browser Not Supported",
        description: "Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari for the best experience.",
        showRetry: false
      };
    }

    if (error?.includes('service-not-allowed')) {
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        title: "Service Blocked",
        description: "Speech recognition service is blocked. This might be due to network restrictions, browser policies, or privacy settings. Try refreshing the page or using a different network.",
        showRetry: true
      };
    }

    if (error?.includes('not-allowed') || error?.includes('denied')) {
      return {
        icon: <Mic className="h-4 w-4" />,
        title: "Microphone Access Required",
        description: "Please allow microphone access in your browser settings. Look for the microphone icon in your address bar and click 'Allow'.",
        showRetry: true
      };
    }

    return {
      icon: <AlertCircle className="h-4 w-4" />,
      title: "Voice Input Issue",
      description: error || "There was an issue with voice input. Please try again.",
      showRetry: true
    };
  };

  const helpContent = getHelpContent();

  return (
    <div className={`p-4 bg-amber-50 border-l-4 border-amber-400 ${className}`}>
      <Alert className="border-amber-200 bg-transparent">
        <div className="flex items-start gap-3">
          <div className="text-amber-600 mt-0.5">
            {helpContent.icon}
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-amber-800 mb-1">
              {helpContent.title}
            </h4>
            <AlertDescription className="text-amber-700 mb-3">
              {helpContent.description}
            </AlertDescription>
            
            {helpContent.showRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            )}
            
            <div className="mt-3 text-xs text-amber-600">
              <strong>Quick fixes:</strong>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>Check your microphone is connected and working</li>
                <li>Allow microphone permissions when prompted</li>
                <li>Try refreshing the page</li>
                <li>Use Chrome, Edge, or Safari browser</li>
              </ul>
            </div>
          </div>
        </div>
      </Alert>
    </div>
  );
};
