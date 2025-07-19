import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  google_user_id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  jwtToken: string | null;
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setJwtToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      jwtToken: null,
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),
      setAuthenticated: (authenticated) =>
        set({ isAuthenticated: authenticated }),
      setLoading: (loading) => set({ isLoading: loading }),
      setJwtToken: (token) => set({ jwtToken: token }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          jwtToken: null,
        }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        jwtToken: state.jwtToken,
      }),
    }
  )
);
