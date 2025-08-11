import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Button } from "@/components/ui/button";
import { BACKEND_URL } from "../constants/apiConstants";

interface ChatProtectedRouteProps {
  children: React.ReactNode;
}

interface UserAccounts {
  primary: any | null;
  secondary: any | null;
}

export const ChatProtectedRoute: React.FC<ChatProtectedRouteProps> = ({
  children,
}) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const [accounts, setAccounts] = useState<UserAccounts>({
    primary: null,
    secondary: null,
  });
  const [accountsLoading, setAccountsLoading] = useState(true);

  useEffect(() => {
    if (user?.id && isAuthenticated) {
      fetchUserAccounts();
    } else {
      setAccountsLoading(false);
    }
  }, [user, isAuthenticated]);

  const fetchUserAccounts = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/user-accounts/${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts);
      } else {
        console.error("Failed to fetch user accounts");
      }
    } catch (error) {
      console.error("Error fetching user accounts:", error);
    } finally {
      setAccountsLoading(false);
    }
  };

  if (isLoading || accountsLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if primary account is connected
  const primaryConnected =
    !!accounts.primary && accounts.primary.connected !== false;
  if (!primaryConnected) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="mb-8">
            <img
              src="/lovable-uploads/efb1c112-c79e-44ff-89be-4cf33f21c7f4.png"
              alt="Deana.AI"
              className="h-16 mx-auto mb-6"
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Primary Account Required
            </h1>
            <p className="text-gray-600 mb-8">
              A primary Google account connection is required to use the chat
              functionality. Please connect or reconnect your primary account in
              the settings page.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => (window.location.href = "/settings")}
              className="w-full"
            >
              Go to Settings
            </Button>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="w-full"
            >
              Go Back
            </Button>
          </div>

          <div className="mt-8 text-sm text-gray-500">
            <p>
              You can connect your primary account and optionally a secondary
              account for additional Google services access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
