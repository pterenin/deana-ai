
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface ProgressIndicatorProps {
  progress: number;
  message?: string;
  isVisible: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  message = 'Processing...',
  isVisible
}) => {
  if (!isVisible) return null;

  return (
    <div className="flex gap-3 mb-4 justify-start">
      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
        <Loader2 className="w-4 h-4 text-white animate-spin" />
      </div>
      <div className="bg-white border border-gray-200 shadow-sm px-4 py-3 rounded-2xl min-w-[200px]">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{message}</span>
            <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>
    </div>
  );
};
