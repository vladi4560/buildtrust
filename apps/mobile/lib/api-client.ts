import { createApiClient } from "@buildtrust/shared";
import { useAuthStore } from "./auth-store";

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export const apiClient = createApiClient({
  baseUrl,
  getToken: () => useAuthStore.getState().token,
});
