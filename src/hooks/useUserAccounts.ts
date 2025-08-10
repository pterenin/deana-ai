import { useCallback, useEffect, useState } from "react";
import { BACKEND_URL } from "@/constants/apiConstants";

export interface AccountInfo {
  email: string;
  name: string;
  avatar_url: string;
  title: string;
  scope: string;
  expires_at: string;
  connected: boolean;
}

export interface UserAccounts {
  primary: AccountInfo | null;
  secondary: AccountInfo | null;
}

export function useUserAccounts(googleUserId?: string | null) {
  const [accounts, setAccounts] = useState<UserAccounts>({
    primary: null,
    secondary: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!googleUserId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${BACKEND_URL}/user-accounts/${googleUserId}`
      );
      if (!response.ok) throw new Error("Failed to fetch user accounts");
      const data = await response.json();
      const now = Date.now();
      const normalize = (acc: AccountInfo | null): AccountInfo | null => {
        if (!acc) return null;
        const expiresAtMs = acc.expires_at
          ? new Date(acc.expires_at).getTime()
          : 0;
        return { ...acc, connected: expiresAtMs > now };
      };
      setAccounts({
        primary: normalize(data.accounts.primary),
        secondary: normalize(data.accounts.secondary),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [googleUserId]);

  useEffect(() => {
    if (googleUserId) fetchAccounts();
  }, [googleUserId, fetchAccounts]);

  return { accounts, loading, error, refetch: fetchAccounts, setAccounts };
}
