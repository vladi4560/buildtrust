import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button } from "../../components";
import { strings } from "../../lib";

export default function Landing() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-between px-6 py-10">
        <View className="flex-1 items-center justify-center gap-3">
          <Text className="text-4xl font-bold text-ink">BuildTrust</Text>
          <Text className="text-center text-base text-muted">{strings.landing.tagline}</Text>
        </View>

        <View className="gap-3">
          <Button
            label={strings.landing.getStarted}
            onPress={() => router.push("/(auth)/register")}
          />
          <Button
            label={strings.landing.logIn}
            variant="outline"
            onPress={() => router.push("/(auth)/login")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
