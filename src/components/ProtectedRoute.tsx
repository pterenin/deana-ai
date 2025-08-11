import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Button } from "@/components/ui/button";
import ConnectGoogleButton from "./ConnectGoogleButton";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="mb-8">
            <img
              src="/assets/logo.png"
              alt="Deana.AI"
              className="h-16 mx-auto mb-6"
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Connect to Continue
            </h1>
            <p className="text-gray-600 mb-8">
              Please connect to your Google account before proceeding with chat.
              This allows us to provide you with personalized assistance and
              access to your calendar.
            </p>
          </div>

          <div className="space-y-4">
            <ConnectGoogleButton />
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
              By connecting your Google account, you agree to our privacy policy
              and terms of service.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
