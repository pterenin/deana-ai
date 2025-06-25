
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
          <div>
            <h1 className="text-lg font-medium text-gray-900">
              Write with{' '}
              <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 bg-clip-text text-transparent font-bold">
                Deana.AI
              </span>
            </h1>
          </div>
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
