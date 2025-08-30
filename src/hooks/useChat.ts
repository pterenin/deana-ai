import { useRef, useState } from "react";
import { useChatStore } from "../store/chatStore";
import { useTTS } from "./useTTS";
import { useSpeechToText } from "./useSpeechToText";
import { useAuthStore } from "../store/authStore";
import { BACKEND_CHAT_ENDPOINT, BACKEND_URL } from "@/constants/apiConstants";
import { INITIAL_MESSAGE } from "@/constants";
import { buildSessionId } from "@/lib/session";

export const useChat = () => {
  const {
    addMessage,
    setLoading,
    isMuted,
    updateLastMessage,
    updateMessageStatus,
  } = useChatStore();
  const { user } = useAuthStore();
  const {
    playTTS,
    stop: stopTTS,
    speakSentencesStreaming,
  } = useTTS({ streaming: true });
  const { stopListening } = useSpeechToText();
  const [error, setError] = useState<string | null>(null);
  const didStreamTTSRef = useRef(false);

  // Track spoken progress per active bot message
  const lastSpokenTextRef = useRef<string>("");
  const spokenSentencesRef = useRef<Set<string>>(new Set());

  const splitIntoSentences = (text: string): string[] =>
    text
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);

  const hasAlphaNum = (s: string) => /[\p{L}\p{N}]/u.test(s);

  const enqueueNewSentences = (fullContent: string) => {
    // Only speak new delta, avoid duplicates
    const prev = lastSpokenTextRef.current;
    let delta = "";
    if (fullContent.startsWith(prev)) {
      delta = fullContent.slice(prev.length);
    } else {
      // Content changed unexpectedly; resync baseline without replaying old lines
      // Try to find the longest common prefix window end
      delta = fullContent;
    }

    // Update baseline for next pass
    lastSpokenTextRef.current = fullContent;

    const newSentences = splitIntoSentences(delta).filter((s) => {
      if (!hasAlphaNum(s)) return false; // skip emoji-only or punctuation-only
      if (spokenSentencesRef.current.has(s)) return false; // already spoken
      spokenSentencesRef.current.add(s);
      return true;
    });

    if (newSentences.length > 0) {
      didStreamTTSRef.current = true;
      void speakSentencesStreaming(newSentences.join(" "));
    }
  };

  const sendMessage = async (text: string) => {
    try {
      setError(null);
      didStreamTTSRef.current = false;
      lastSpokenTextRef.current = "";
      spokenSentencesRef.current = new Set();

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
      if (text !== INITIAL_MESSAGE) {
        addMessage({
          from: "user",
          text,
        });
      }

      // Show loading state
      setLoading(true);

      // Add initial bot message for streaming
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

      // Load phone from localStorage
      const phone = localStorage.getItem("user_phone_e164") || null;

      // Timezone and client time info
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const clientNowISO = new Date().toISOString();

      // Build per-page session id
      const sessionId = buildSessionId(user.google_user_id);

      // Call the backend /chat endpoint with streaming
      const chatPayload = {
        text,
        googleUserId: user.google_user_id,
        sessionId,
        ...(secondaryGoogleUserId && { secondaryGoogleUserId }),
        ...(phone && { phone }),
        timezone,
        clientNowISO,
      } as any;

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

        // Stop speech recognition when TTS is playing to prevent feedback
        if (!isMuted) stopListening();

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
                    updateMessageStatus(botMessageId, data.content);
                    break;

                  case "progress":
                    updateMessageStatus(botMessageId, data.content);
                    break;

                  case "response":
                    finalMessage = data.content;
                    updateLastMessage(botMessageId, data.content);
                    if (!isMuted && typeof data.content === "string") {
                      enqueueNewSentences(data.content);
                    }
                    break;

                  case "complete":
                    break;

                  case "error":
                    updateLastMessage(botMessageId, `Error: ${data.content}`);
                    break;

                  case "final":
                    // Handle final response for compatibility
                    finalMessage = data.output || data.text;
                    updateLastMessage(botMessageId, finalMessage);
                    if (!isMuted && typeof finalMessage === "string") {
                      enqueueNewSentences(finalMessage);
                    }
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

        // Fallback: if nothing was streamed to TTS, speak once at the end
        if (!isMuted && finalMessage && !didStreamTTSRef.current) {
          await playTTS(finalMessage);
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
