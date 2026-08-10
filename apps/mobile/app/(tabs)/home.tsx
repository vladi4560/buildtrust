import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Full Home screen (budget card, project cards, New Project) lands in Phase 5.
export default function Home() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-semibold text-ink">Home</Text>
      </View>
    </SafeAreaView>
  );
}
