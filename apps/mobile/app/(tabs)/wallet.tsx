import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Full Wallet screen (escrow balance card, transaction feed) lands in Phase 5.
export default function Wallet() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-semibold text-ink">Wallet</Text>
      </View>
    </SafeAreaView>
  );
}
