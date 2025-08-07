import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "../store/authStore";
import { BACKEND_URL } from "../constants/apiConstants";

interface AccountInfo {
  email: string;
  name: string;
  avatar_url: string;
  title: string;
  scope: string;
  expires_at: string;
  connected: boolean;
}

interface UserAccounts {
  primary: AccountInfo | null;
  secondary: AccountInfo | null;
}

export default function Settings() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const [accounts, setAccounts] = useState<UserAccounts>({
    primary: null,
    secondary: null,
  });
  const [loading, setLoading] = useState(true);
  const [updatingTitle, setUpdatingTitle] = useState<string | null>(null);
  const [titleInputs, setTitleInputs] = useState({
    primary: "",
    secondary: "",
  });

  useEffect(() => {
    if (user?.id) {
      fetchUserAccounts();
    } else {
      // User is not authenticated, stop loading
      setLoading(false);
    }
  }, [user]);

  const fetchUserAccounts = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/user-accounts/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts);
        setTitleInputs({
          primary: data.accounts.primary?.title || "",
          secondary: data.accounts.secondary?.title || "",
        });
      } else {
        console.error("Failed to fetch user accounts");
      }
    } catch (error) {
      console.error("Error fetching user accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAccount = (accountType: "primary" | "secondary") => {
    const title = titleInputs[accountType].trim();
    if (!title) {
      toast({
        title: "Title Required",
        description: `Please enter a title for your ${accountType} account`,
        variant: "destructive",
      });
      return;
    }

    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      "565475271415-75vb447aacu3okrhs0g0ohec07t5m424.apps.googleusercontent.com";
    const redirectUri =
      import.meta.env.VITE_OAUTH_REDIRECT_URI ||
      "http://localhost:3000/oauth2callback";

    const scope = [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar",
      "https://mail.google.com/",
      "https://www.googleapis.com/auth/contacts.readonly",
      "https://www.googleapis.com/auth/contacts.other.readonly",
    ].join(" ");

    // Store connection details in localStorage for the callback to use
    localStorage.setItem(
      "oauth_connection_details",
      JSON.stringify({
        accountType,
        title,
        currentUserId: user?.id || null,
      })
    );

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent`;

    window.location.href = authUrl;
  };

  const handleDisconnectAccount = async (
    accountType: "primary" | "secondary"
  ) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please authenticate first to disconnect accounts",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/google-disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          accountType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Disconnected",
          description: data.message,
        });
        await fetchUserAccounts(); // Refresh accounts
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description:
            data.error || `Failed to disconnect ${accountType} account`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to disconnect ${accountType} account`,
        variant: "destructive",
      });
    }
  };

  const handleUpdateTitle = async (accountType: "primary" | "secondary") => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please authenticate first to update account titles",
        variant: "destructive",
      });
      return;
    }

    const newTitle = titleInputs[accountType].trim();
    if (!newTitle) {
      toast({
        title: "Title Required",
        description: "Please enter a valid title",
        variant: "destructive",
      });
      return;
    }

    setUpdatingTitle(accountType);
    try {
      const response = await fetch(`${BACKEND_URL}/update-account-title`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleUserId: user.id,
          accountType,
          title: newTitle,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Title Updated",
          description: data.message,
        });
        await fetchUserAccounts(); // Refresh accounts
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Failed to update title",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update account title",
        variant: "destructive",
      });
    } finally {
      setUpdatingTitle(null);
    }
  };

  const renderAccountCard = (
    accountType: "primary" | "secondary",
    account: AccountInfo | null
  ) => {
    const isConnected = account && account.connected;
    const isPrimary = accountType === "primary";

    return (
      <Card key={accountType} className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isPrimary ? "Primary Account" : "Secondary Account"}
                {isPrimary && <Badge variant="destructive">Required</Badge>}
                {!isPrimary && <Badge variant="secondary">Optional</Badge>}
              </CardTitle>
              <CardDescription>
                {isPrimary
                  ? "Required for chat functionality. This will be your main Google account."
                  : "Optional secondary account for accessing additional Google services."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${accountType}-title`}>Account Title</Label>
            <div className="flex gap-2">
              <Input
                id={`${accountType}-title`}
                value={titleInputs[accountType]}
                onChange={(e) =>
                  setTitleInputs((prev) => ({
                    ...prev,
                    [accountType]: e.target.value,
                  }))
                }
                placeholder={isPrimary ? "e.g., Personal" : "e.g., Work"}
                disabled={!user}
              />
              {isConnected && (
                <Button
                  onClick={() => handleUpdateTitle(accountType)}
                  disabled={updatingTitle === accountType}
                  variant="outline"
                >
                  {updatingTitle === accountType ? "Updating..." : "Update"}
                </Button>
              )}
            </div>
          </div>

          {isConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {account.avatar_url && (
                  <img
                    src={account.avatar_url}
                    alt="Profile"
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">{account.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {account.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Title: <span className="font-medium">{account.title}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleDisconnectAccount(accountType)}
                  variant="destructive"
                  size="sm"
                >
                  Disconnect
                </Button>
                <Badge variant="outline" className="text-green-600">
                  Connected
                </Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground">Not connected</p>
              <Button
                onClick={() => handleConnectAccount(accountType)}
                disabled={!titleInputs[accountType].trim()}
                className="w-full"
              >
                Connect {isPrimary ? "Primary" : "Secondary"} Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading account settings...</p>
        </div>
      </div>
    );
  }

  // Show welcome message for unauthenticated users
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground mt-2">
              Connect your Google accounts to get started with Deana.AI.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">1</span>
              </div>
              <h3 className="text-lg font-semibold text-blue-900">
                Get Started
              </h3>
            </div>
            <p className="text-blue-800 mb-6">
              Connect your first Google account to start using Deana.AI. You can
              add a secondary account later for additional services.
            </p>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              {renderAccountCard("primary", null)}
              {renderAccountCard("secondary", null)}
            </div>
          </div>

          <div className="mt-8 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">What you can do:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • Connect your primary Google account to access chat
                functionality
              </li>
              <li>
                • Add an optional secondary account for additional Google
                services
              </li>
              <li>
                • Customize account titles to easily identify them (e.g.,
                "Personal", "Work")
              </li>
              <li>• Manage and disconnect accounts anytime</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your Google account connections. The primary account is
            required for chat functionality.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {renderAccountCard("primary", accounts.primary)}
          {renderAccountCard("secondary", accounts.secondary)}
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Important Notes:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Primary account is required to use the chat functionality</li>
            <li>
              • Secondary account is optional and can provide access to
              additional Google services
            </li>
            <li>
              • You can customize the title for each account to help identify
              them
            </li>
            <li>
              • Both accounts can be disconnected and reconnected at any time
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
