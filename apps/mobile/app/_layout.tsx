import "../global.css";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { apiClient, queryClient, useAuthStore } from "../lib";
import { colors } from "../theme/tokens";

function RootLayoutNav() {
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient.auth.me(),
    enabled: isHydrated && !!token,
    retry: false,
  });

  useEffect(() => {
    if (meQuery.data) setUser(meQuery.data);
  }, [meQuery.data, setUser]);

  useEffect(() => {
    if (meQuery.isError) logout();
  }, [meQuery.isError, logout]);

  const stillResolvingSession = !isHydrated || (!!token && meQuery.isPending);

  if (stillResolvingSession) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}
