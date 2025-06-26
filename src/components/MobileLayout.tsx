
import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children, className }) => {
  return (
    <div className={cn(
      "min-h-screen bg-white",
      // Mobile-specific styles
      "safe-area-inset-top safe-area-inset-bottom",
      // Ensure proper spacing on mobile devices
      "flex flex-col",
      className
    )}>
      {children}
    </div>
  );
};
