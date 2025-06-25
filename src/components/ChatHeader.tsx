
import React from 'react';
import { Bell } from 'lucide-react';

export const ChatHeader: React.FC = () => {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center">
            <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
              <div className="w-3 h-3 border-2 border-white rounded-sm transform rotate-45"></div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex justify-center">
          <img 
            src="/lovable-uploads/efb1c112-c79e-44ff-89be-4cf33f21c7f4.png" 
            alt="Deana.AI" 
            className="h-8 object-contain" 
          />
        </div>
        
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <Bell size={20} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};
