import React from "react";
import { Bell, Volume2, VolumeX, LogOut, User } from "lucide-react";
import { useChatStore } from "../store/chatStore";
import { useAuthStore } from "../store/authStore";
import ConnectGoogleButton from "./ConnectGoogleButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const ChatHeader: React.FC = () => {
  const { isMuted, toggleMute } = useChatStore();
  const { user, logout } = useAuthStore();

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
            src="/assets/logo.png"
            alt="Deana.AI"
            className="h-8 object-contain"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label={isMuted ? "Enable sound" : "Disable sound"}
          >
            {isMuted ? (
              <VolumeX size={20} className="text-gray-600" />
            ) : (
              <Volume2 size={20} className="text-gray-600" />
            )}
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <Bell size={20} className="text-gray-600" />
          </button>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name || user.email}
                      className="h-6 w-6 rounded-full"
                    />
                  ) : (
                    <User size={16} />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-sm">
                  <User size={16} className="mr-2" />
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut size={16} className="mr-2" />
                  Disconnect Google
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <ConnectGoogleButton />
          )}
        </div>
      </div>
    </div>
  );
};
