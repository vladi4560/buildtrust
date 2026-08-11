import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Full marketplace (search, category grid, top rated near you) lands next.
export default function Discover() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-semibold text-ink">Discover</Text>
      </View>
    </SafeAreaView>
  );
}
