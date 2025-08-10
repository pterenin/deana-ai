import { useState, useRef, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";

interface UseSpeechToTextOptions {
  language?: string;
  continuous?: boolean;
}

interface PermissionStatus {
  granted: boolean;
  error: string | null;
  isHttps: boolean;
  browserSupported: boolean;
}

export const useSpeechToText = (options: UseSpeechToTextOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({
    granted: false,
    error: null,
    isHttps:
      typeof window !== "undefined"
        ? window.location.protocol === "https:"
        : false,
    browserSupported:
      typeof window !== "undefined" &&
      ("webkitSpeechRecognition" in window || "SpeechRecognition" in window),
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    console.log("Checking speech recognition permissions...");

    // Check HTTPS requirement
    const isHttps =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost";
    if (!isHttps) {
      const httpsError =
        "Speech recognition requires HTTPS. Please access the site via HTTPS.";
      setError(httpsError);
      setPermissionStatus((prev) => ({
        ...prev,
        error: httpsError,
        isHttps: false,
      }));
      toast({
        title: "HTTPS Required",
        description:
          "Speech recognition requires a secure connection. Please access the site via HTTPS.",
        variant: "destructive",
      });
      return false;
    }

    // Check browser support
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      const browserError =
        "Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.";
      setError(browserError);
      setPermissionStatus((prev) => ({
        ...prev,
        error: browserError,
        browserSupported: false,
      }));
      toast({
        title: "Browser Not Supported",
        description:
          "Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Request microphone permission explicitly
      console.log("Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Stop the stream immediately as we only needed permission
      stream.getTracks().forEach((track) => track.stop());

      setPermissionStatus((prev) => ({ ...prev, granted: true, error: null }));
      setError(null);
      console.log("Microphone permission granted");
      return true;
    } catch (err: any) {
      console.error("Permission error:", err);

      let errorMessage = "Microphone access denied.";
      let toastMessage = "Please allow microphone access to use voice input.";

      if (err.name === "NotAllowedError") {
        errorMessage =
          "Microphone access denied. Please allow microphone permissions in your browser settings.";
        toastMessage =
          "Please allow microphone access in your browser settings and try again.";
      } else if (err.name === "NotFoundError") {
        errorMessage =
          "No microphone found. Please connect a microphone and try again.";
        toastMessage = "No microphone detected. Please connect a microphone.";
      } else if (err.name === "NotSupportedError") {
        errorMessage =
          "Speech recognition is not supported on this device or browser.";
        toastMessage =
          "Speech recognition is not supported. Please try a different browser.";
      }

      setError(errorMessage);
      setPermissionStatus((prev) => ({
        ...prev,
        granted: false,
        error: errorMessage,
      }));

      toast({
        title: "Microphone Access Required",
        description: toastMessage,
        variant: "destructive",
      });

      return false;
    }
  }, []);

  const startListening = useCallback(async () => {
    console.log("Starting speech recognition...");

    // Check permissions first
    const hasPermission = await checkPermissions();
    if (!hasPermission) {
      return;
    }

    try {
      // Clear transcript when starting to listen
      setTranscript("");
      finalTranscriptRef.current = "";

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = options.continuous ?? true;
      recognition.interimResults = true;
      recognition.lang = options.language || "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        console.log("Speech recognition started successfully");
      };

      recognition.onresult = (event) => {
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        const fullTranscript = finalTranscriptRef.current + interimTranscript;
        setTranscript(fullTranscript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);

        let errorMessage = `Speech recognition error: ${event.error}`;
        let toastMessage =
          "An error occurred with speech recognition. Please try again.";

        switch (event.error) {
          case "not-allowed":
            errorMessage =
              "Microphone access denied. Please allow microphone permissions.";
            toastMessage = "Please allow microphone access and try again.";
            break;
          case "no-speech":
            errorMessage = "No speech detected. Please try speaking again.";
            toastMessage = "No speech detected. Please try speaking again.";
            break;
          case "audio-capture":
            errorMessage =
              "Audio capture failed. Please check your microphone.";
            toastMessage =
              "Audio capture failed. Please check your microphone connection.";
            break;
          case "network":
            errorMessage =
              "Network error occurred. Please check your internet connection.";
            toastMessage =
              "Network error. Please check your internet connection.";
            break;
          case "service-not-allowed":
            errorMessage =
              "Speech service not allowed. This may be due to browser restrictions or network policies.";
            toastMessage =
              "Speech service blocked. Please check your network settings or try a different browser.";
            break;
        }

        setError(errorMessage);
        toast({
          title: "Speech Recognition Error",
          description: toastMessage,
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log("Speech recognition ended");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setError("Failed to start speech recognition. Please try again.");
      setIsListening(false);
      toast({
        title: "Recognition Failed",
        description: "Failed to start speech recognition. Please try again.",
        variant: "destructive",
      });
    }
  }, [options.continuous, options.language, checkPermissions]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    console.log("Speech recognition stopped by user");
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    finalTranscriptRef.current = "";
  }, []);

  const retryPermission = useCallback(async () => {
    console.log("Retrying permission check...");
    await checkPermissions();
  }, [checkPermissions]);

  return {
    isListening,
    transcript,
    error,
    permissionStatus,
    startListening,
    stopListening,
    clearTranscript,
    retryPermission,
  };
};
