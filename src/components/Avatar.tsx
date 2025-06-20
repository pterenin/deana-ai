
import React from 'react';
import { User, Bot } from 'lucide-react';

interface AvatarProps {
  type: 'user' | 'bot';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ type, className = '' }) => {
  const baseClasses = "w-8 h-8 rounded-full flex items-center justify-center text-white";
  const typeClasses = type === 'bot' 
    ? "bg-blue-500" 
    : "bg-gray-500";
  
  return (
    <div className={`${baseClasses} ${typeClasses} ${className}`}>
      {type === 'bot' ? (
        <Bot size={16} />
      ) : (
        <User size={16} />
      )}
    </div>
  );
};
