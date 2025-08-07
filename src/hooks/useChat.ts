import { useState } from "react";
import { useChatStore } from "../store/chatStore";
import { useTTS } from "./useTTS";
import { useSpeechToText } from "./useSpeechToText";
import { useAuthStore } from "../store/authStore";
import { BACKEND_CHAT_ENDPOINT, BACKEND_URL } from "@/constants/apiConstants";

export const useChat = () => {
  const {
    addMessage,
    setLoading,
    isMuted,
    updateLastMessage,
    updateMessageStatus,
  } = useChatStore();
  const { user, jwtToken } = useAuthStore();
  const { playTTS, stop: stopTTS } = useTTS();
  const { stopListening } = useSpeechToText();
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (text: string) => {
    try {
      setError(null);

      // Check if user is authenticated
      if (!user || !user.google_user_id) {
        const errorMessage =
          "Please connect your Google account first to use the chat.";
        addMessage({
          from: "bot",
          text: errorMessage,
        });
        return;
      }

      // Stop any currently playing audio when sending a new message
      stopTTS();

      // Add user message immediately
      console.log("Adding user message:", text);
      console.log(
        "Current messages before adding user message:",
        useChatStore.getState().messages
      );
      addMessage({
        from: "user",
        text,
      });

      console.log("Sending message to backend for user:", user.google_user_id);

      // Show loading state
      setLoading(true);

      // Add initial bot message for streaming
      console.log("Adding initial bot message with empty text");
      const botMessageId = addMessage({
        from: "bot",
        text: "",
      });

      // Fetch user accounts to get secondary Google user ID if available
      let secondaryGoogleUserId = null;
      try {
        const accountsResponse = await fetch(
          `${BACKEND_URL}/user-accounts/${user.google_user_id}`
        );
        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json();
          if (
            accountsData.accounts.secondary &&
            accountsData.accounts.secondary.google_user_id
          ) {
            secondaryGoogleUserId =
              accountsData.accounts.secondary.google_user_id;
          }
        }
      } catch (error) {
        console.log("Could not fetch secondary account info:", error);
      }

      // Call the backend /chat endpoint with streaming
      const chatPayload = {
        text,
        googleUserId: user.google_user_id,
        ...(secondaryGoogleUserId && { secondaryGoogleUserId }),
      };

      console.log("Sending chat payload:", chatPayload);

      const response = await fetch(BACKEND_CHAT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chatPayload),
      });

      if (response.ok) {
        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let finalMessage = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (data.type) {
                  case "status":
                    console.log("📊 Status update:", data.content);
                    updateMessageStatus(botMessageId, data.content);
                    break;

                  case "progress":
                    console.log("📊 Progress update:", data.content);
                    updateMessageStatus(botMessageId, data.content);
                    break;

                  case "response":
                    console.log("💬 Agent response:", data.content);
                    finalMessage = data.content;
                    console.log(
                      "Updating bot message with response:",
                      data.content
                    );
                    updateLastMessage(botMessageId, data.content);
                    break;

                  case "complete":
                    console.log("✅ Agent finished processing");
                    break;

                  case "error":
                    console.log("❌ Error:", data.content);
                    updateLastMessage(botMessageId, `Error: ${data.content}`);
                    break;

                  case "final":
                    // Handle final response for compatibility
                    finalMessage = data.output || data.text;
                    updateLastMessage(botMessageId, finalMessage);
                    break;
                }
              } catch (e) {
                console.log("Raw SSE data:", line);
              }
            }
          }
        }

        // Release the input field after streaming is complete
        setLoading(false);

        // Use OpenAI TTS for audio playback if not muted
        if (!isMuted && finalMessage) {
          console.log("Playing TTS for response");
          // Stop speech recognition when TTS is playing to prevent feedback
          stopListening();
          playTTS(finalMessage);
        }
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      console.error("Chat error:", err);

      // Add error message as bot response
      const errorMessage =
        err instanceof Error && err.message.includes("Google account")
          ? err.message
          : "Sorry, I encountered an error. Please try again.";

      addMessage({
        from: "bot",
        text: errorMessage,
      });

      // Release the input field after error handling
      setLoading(false);

      // Use TTS for error message if not muted
      if (!isMuted) {
        playTTS(errorMessage);
      }
    }
  };

  const handleActionClick = (action: string) => {
    console.log("Action clicked:", action);
    // Handle action button clicks
  };

  return {
    sendMessage,
    handleActionClick,
    error,
  };
};
