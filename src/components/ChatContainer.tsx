import React, { useEffect, useRef } from "react";
import { Bubble } from "./Bubble";
import { WelcomeMessage } from "./WelcomeMessage";
import { useChatStore } from "../store/chatStore";

interface ChatContainerProps {
  onAction: (actionId: string) => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ onAction }) => {
  const { messages, isLoading } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-white p-4"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      <div className="max-w-4xl mx-auto">
        {messages.length === 0 && <WelcomeMessage />}

        {messages.map((message) => (
          <Bubble key={message.id} message={message} onAction={onAction} />
        ))}

        {/* Simple loading indicator */}
        {isLoading && (
          <div className="flex gap-3 mb-4 justify-start">
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
              <img
                src="/assets/bot.png"
                alt="Deana AI"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="bg-gray-100 px-5 py-4 rounded-3xl">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
