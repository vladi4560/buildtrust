import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button } from "../../components";
import { useAuthStore } from "../../lib";

// Full Settings list (verification status, edit profile, etc.) lands in Phase 5.
export default function More() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const onLogOut = async () => {
    await logout();
    router.replace("/(auth)/landing");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 gap-6 px-6 py-10">
        <Text className="text-lg font-semibold text-ink">{user?.fullName}</Text>
        <View className="flex-1" />
        <Button label="Log Out" variant="outline" onPress={onLogOut} />
      </View>
    </SafeAreaView>
  );
}
