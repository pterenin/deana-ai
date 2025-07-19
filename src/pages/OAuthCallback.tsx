import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "../store/authStore";
import { BACKEND_OAUTH_ENDPOINT } from "@/constants/apiConstants";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setUser, setLoading, setJwtToken } = useAuthStore();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");

      if (error) {
        toast({
          title: "Authentication Error",
          description: `OAuth error: ${error}`,
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      if (!code) {
        toast({
          title: "Authentication Error",
          description: "No authorization code received",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setLoading(true);

      try {
        toast({
          title: "Connecting to Google",
          description: "Processing your Google account connection...",
        });

        // Send the code to your Express OAuth server for token exchange
        const response = await fetch(BACKEND_OAUTH_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to exchange code for tokens"
          );
        }

        const data = await response.json();
        console.log("Google auth successful:", data);

        // Set user in auth store
        if (data.userId && data.email) {
          setUser({
            id: data.userId,
            google_user_id: data.google_user_id || data.userId,
            email: data.email,
            name: data.name,
            avatar_url: data.avatar_url,
          });

          // Store JWT token if provided
          if (data.jwt_token) {
            setJwtToken(data.jwt_token);
          }
        }

        toast({
          title: "Authentication Complete",
          description: "Your Google account has been successfully connected.",
        });

        // Redirect to chat page
        navigate("/chat");
      } catch (error) {
        console.error("Error exchanging code for tokens:", error);
        toast({
          title: "Authentication Error",
          description: `Failed to complete Google authentication: ${error.message}`,
          variant: "destructive",
        });
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    handleOAuthCallback();
  }, [navigate, toast, setUser, setLoading, setJwtToken]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Processing Google authentication...</p>
      </div>
    </div>
  );
}
