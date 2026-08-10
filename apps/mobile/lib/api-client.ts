import { Platform } from "react-native";
import { createApiClient } from "@buildtrust/shared";
import { useAuthStore } from "./auth-store";

// Android emulators can't reach the host machine via localhost - 10.0.2.2 is
// the documented alias for it. Physical devices need EXPO_PUBLIC_API_URL set
// to the host's LAN IP explicitly (there's no way to auto-detect that).
const defaultBaseUrl = Platform.select({
  android: "http://10.0.2.2:4000",
  default: "http://localhost:4000",
});

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? defaultBaseUrl;

export const apiClient = createApiClient({
  baseUrl,
  getToken: () => useAuthStore.getState().token,
});
