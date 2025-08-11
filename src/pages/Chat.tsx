import React from "react";
import { ChatContainer } from "../components/ChatContainer";
import { ChatInput } from "../components/ChatInput";
import { useChat } from "../hooks/useChat";
import { useChatStore } from "../store/chatStore";
import { Toaster } from "@/components/ui/toaster";

const Chat = () => {
  const { sendMessage, handleActionClick, error } = useChat();
  const { isLoading } = useChatStore();

  return (
    <div className="fixed inset-x-0 top-14 bottom-0 flex flex-col bg-white">
      <div className="flex-1 min-h-0 flex flex-col">
        <ChatContainer onAction={handleActionClick} />
      </div>

      <ChatInput onSendMessage={sendMessage} disabled={isLoading} />

      {error && (
        <div className="bg-red-50 border-t border-red-200 p-2 text-center">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <Toaster />
    </div>
  );
};

export default Chat;
