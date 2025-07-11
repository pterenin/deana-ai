import React, { useEffect } from "react";
import { useAuthStore } from "../store/authStore";

export const AuthCheck: React.FC = () => {
  const { user, setLoading } = useAuthStore();

  useEffect(() => {
    // Check if user is authenticated on app load
    if (user) {
      console.log("User is authenticated:", user.email);
    } else {
      console.log("No authenticated user found");
    }
    setLoading(false);
  }, [user, setLoading]);

  return null; // This component doesn't render anything
};
