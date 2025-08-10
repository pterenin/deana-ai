import React, { useEffect } from "react";
import { useAuthStore } from "../store/authStore";

export const AuthCheck: React.FC = () => {
  const { user, setLoading, setGoogleConnected } = useAuthStore();

  useEffect(() => {
    // Check if user is authenticated on app load
    if (user) {
      console.log("User is authenticated:", user.email);
    } else {
      console.log("No authenticated user found");
    }
    // Don't assume Google connected on load; the Settings page will compute based on expiry
    if (!user) {
      setGoogleConnected(false);
    }
    setLoading(false);
  }, [user, setLoading, setGoogleConnected]);

  return null; // This component doesn't render anything
};
