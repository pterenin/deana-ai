import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "../store/authStore";
import PhoneSection from "@/components/settings/PhoneSection";
import AccountCard, { AccountInfo } from "@/components/settings/AccountCard";
import { useUserAccounts } from "@/hooks/useUserAccounts";
import { BACKEND_URL } from "@/constants/apiConstants";

export default function Settings() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = !!user;
  const { accounts, loading, refetch } = useUserAccounts(user?.id);

  const [updatingTitle, setUpdatingTitle] = useState<
    "primary" | "secondary" | null
  >(null);
  const [titleInputs, setTitleInputs] = useState({
    primary: "",
    secondary: "",
  });

  useEffect(() => {
    setTitleInputs({
      primary: accounts.primary?.title || "",
      secondary: accounts.secondary?.title || "",
    });
  }, [accounts.primary?.title, accounts.secondary?.title]);

  const beginOAuth = (accountType: "primary" | "secondary", title: string) => {
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

    localStorage.setItem(
      "oauth_connection_details",
      JSON.stringify({ accountType, title, currentUserId: user?.id || null })
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
    beginOAuth(accountType, title);
  };

  const handleReconnect = (accountType: "primary" | "secondary") => {
    const title =
      titleInputs[accountType].trim() ||
      (accountType === "primary" ? "Primary Account" : "Secondary Account");
    beginOAuth(accountType, title);
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
        body: JSON.stringify({ userId: user.id, accountType }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({ title: "Disconnected", description: data.message });
        await refetch();
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
        toast({ title: "Title Updated", description: data.message });
        await refetch();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-14">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading account settings...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl pt-14 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground mt-2">
            Connect your Google accounts to get started with Deana.AI.
          </p>
        </div>

        <PhoneSection />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold">1</span>
            </div>
            <h3 className="text-lg font-semibold text-blue-900">Get Started</h3>
          </div>
          <p className="text-blue-800 mb-6">
            Connect your first Google account to start using Deana.AI. You can
            add a secondary account later for additional services.
          </p>

          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <AccountCard
              accountType="primary"
              account={null}
              titleValue={titleInputs.primary}
              onTitleChange={(v) =>
                setTitleInputs((p) => ({ ...p, primary: v }))
              }
              onUpdateTitle={() => {}}
              onDisconnect={() => {}}
              onReconnect={() => handleReconnect("primary")}
              onConnect={() => handleConnectAccount("primary")}
              updating={false}
              isAuthenticated={false}
            />
            <AccountCard
              accountType="secondary"
              account={null}
              titleValue={titleInputs.secondary}
              onTitleChange={(v) =>
                setTitleInputs((p) => ({ ...p, secondary: v }))
              }
              onUpdateTitle={() => {}}
              onDisconnect={() => {}}
              onReconnect={() => handleReconnect("secondary")}
              onConnect={() => handleConnectAccount("secondary")}
              updating={false}
              isAuthenticated={false}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl pt-14 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your Google account connections. The primary account is
          required for chat functionality.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <AccountCard
          accountType="primary"
          account={accounts.primary as AccountInfo | null}
          titleValue={titleInputs.primary}
          onTitleChange={(v) => setTitleInputs((p) => ({ ...p, primary: v }))}
          onUpdateTitle={() => handleUpdateTitle("primary")}
          onDisconnect={() => handleDisconnectAccount("primary")}
          onReconnect={() => handleReconnect("primary")}
          onConnect={() => handleConnectAccount("primary")}
          updating={updatingTitle === "primary"}
          isAuthenticated={isAuthenticated}
        />
        <AccountCard
          accountType="secondary"
          account={accounts.secondary as AccountInfo | null}
          titleValue={titleInputs.secondary}
          onTitleChange={(v) => setTitleInputs((p) => ({ ...p, secondary: v }))}
          onUpdateTitle={() => handleUpdateTitle("secondary")}
          onDisconnect={() => handleDisconnectAccount("secondary")}
          onReconnect={() => handleReconnect("secondary")}
          onConnect={() => handleConnectAccount("secondary")}
          updating={updatingTitle === "secondary"}
          isAuthenticated={isAuthenticated}
        />
      </div>
      <PhoneSection />

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Important Notes:</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Primary account is required to use the chat functionality</li>
          <li>
            • Secondary account is optional and can provide access to additional
            Google services
          </li>
          <li>
            • You can customize the title for each account to help identify them
          </li>
          <li>
            • Both accounts can be disconnected and reconnected at any time
          </li>
        </ul>
      </div>
    </div>
  );
}
