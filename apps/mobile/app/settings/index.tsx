import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Avatar, Button } from "../../components";
import { useAuthStore } from "../../lib";

function SettingsRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const content = (
    <View className="flex-row items-center justify-between border-b border-border py-4">
      <Text className="text-sm font-medium text-ink">{label}</Text>
      {value ? <Text className="text-sm text-muted">{value}</Text> : null}
    </View>
  );

  if (!onPress) return content;
  return <Pressable onPress={onPress}>{content}</Pressable>;
}

export default function Settings() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const onLogOut = async () => {
    await logout();
    router.replace("/(auth)/landing");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerClassName="gap-6 px-6 py-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-ink">Settings</Text>
          <Text className="text-sm font-medium text-muted" onPress={() => router.back()}>
            Back
          </Text>
        </View>

        <View className="flex-row items-center gap-4">
          <Avatar name={user?.fullName ?? ""} imageUrl={user?.avatarUrl} size={56} />
          <View>
            <Text className="text-lg font-semibold text-ink">{user?.fullName}</Text>
            <Text className="text-sm text-muted">{user?.email}</Text>
          </View>
        </View>

        <View>
          <SettingsRow label="Edit Profile" onPress={() => router.push("/settings/profile")} />
          <SettingsRow
            label="Verification Status"
            value={user?.verified ? "Verified" : "Not verified"}
          />
          <SettingsRow
            label="Role"
            value={user?.role === "PROFESSIONAL" ? "Professional" : "Client"}
          />
        </View>

        <Button label="Log Out" variant="outline" onPress={onLogOut} />
      </ScrollView>
    </SafeAreaView>
  );
}
