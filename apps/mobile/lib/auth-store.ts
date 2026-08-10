import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import type { UserResponse } from "@buildtrust/shared";

const TOKEN_KEY = "buildtrust_token";

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (token: string, user: UserResponse) => Promise<void>;
  setUser: (user: UserResponse) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isHydrated: false,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    set({ token, isHydrated: true });
  },

  setSession: async (token, user) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, user });
  },

  setUser: (user) => set({ user }),

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, user: null });
  },
}));
