import React from "react";
import { User } from "lucide-react";

interface AvatarProps {
  type: "bot" | "user";
}

export const Avatar: React.FC<AvatarProps> = ({ type }) => {
  if (type === "bot") {
    return (
      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
        <img
          src="/assets/bot.png"
          alt="Deana AI"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
      <User size={16} className="text-white" />
    </div>
  );
};
