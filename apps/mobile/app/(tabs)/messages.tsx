import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Messaging is stubbed for v1 (BUILD_SPEC section 12 - out of scope).
export default function Messages() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-lg font-semibold text-ink">Messages</Text>
        <Text className="mt-2 text-center text-sm text-muted">Coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}
