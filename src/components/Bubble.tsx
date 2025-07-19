import React from "react";
import ReactMarkdown from "react-markdown";
import { Avatar } from "./Avatar";
import { ActionButtons } from "./ActionButtons";
import type { Message } from "../store/chatStore";

interface BubbleProps {
  message: Message;
  onAction: (actionId: string) => void;
}

export const Bubble: React.FC<BubbleProps> = ({ message, onAction }) => {
  const isBot = message.from === "bot";

  return (
    <div
      className={`flex gap-3 mb-6 ${isBot ? "justify-start" : "justify-end"}`}
      role="group"
      aria-label={`Message from ${message.from}`}
    >
      {isBot && <Avatar type="bot" />}

      {message.status && !message.text && (
        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700 text-sm">
            <span className="animate-pulse">📊</span>
            <span>{message.status}</span>
          </div>
        </div>
      )}
      {message.text && (
        <div className={`max-w-[70%] ${isBot ? "order-2" : "order-1"}`}>
          <div
            className={`px-5 py-4 rounded-3xl ${
              isBot
                ? "bg-gray-100 text-gray-900"
                : "bg-gray-700 text-white ml-auto rounded-br-lg"
            }`}
          >
            <div
              className={`prose prose-sm max-w-none ${
                isBot ? "prose-gray" : "prose-invert"
              }`}
            >
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => <em className="italic">{children}</em>,
                  code: ({ children }) => (
                    <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-sm">
                      {children}
                    </code>
                  ),
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          </div>

          {isBot && message.actions && (
            <ActionButtons actions={message.actions} onAction={onAction} />
          )}

          <div
            className={`text-xs text-gray-500 mt-2 ${
              isBot ? "text-left" : "text-right"
            }`}
          >
            {message.timestamp?.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      )}

      {!isBot && <Avatar type="user" />}
    </div>
  );
};
