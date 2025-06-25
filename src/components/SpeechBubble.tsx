
import React from 'react';

interface SpeechBubbleProps {
  text: string;
  className?: string;
}

const SpeechBubble = ({ text, className = "" }: SpeechBubbleProps) => {
  return (
    <div className={`relative inline-block ${className}`}>
      <div className="bg-pink-500 text-white px-6 py-3 rounded-full font-medium text-lg shadow-lg">
        {text}
      </div>
      {/* Speech bubble tail */}
      <div className="absolute bottom-0 left-8 transform translate-y-full">
        <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[15px] border-t-pink-500"></div>
      </div>
    </div>
  );
};

export default SpeechBubble;
