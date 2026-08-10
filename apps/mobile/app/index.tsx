import { Redirect } from "expo-router";
import { useAuthStore } from "../lib";

export default function Index() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  if (!token || !user) {
    return <Redirect href="/(auth)/landing" />;
  }
  if (!user.role) {
    return <Redirect href="/(auth)/role" />;
  }
  return <Redirect href="/(tabs)/home" />;
}
