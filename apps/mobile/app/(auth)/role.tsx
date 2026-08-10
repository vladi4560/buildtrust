import { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { UserRole } from "@buildtrust/shared";
import { Button, Card } from "../../components";
import { apiClient, strings, useAuthStore } from "../../lib";

const ROLES: { value: UserRole; title: string; description: string }[] = [
  { value: "CLIENT", ...strings.role.client },
  { value: "PROFESSIONAL", ...strings.role.professional },
];

export default function RoleSelect() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onContinue = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const user = await apiClient.auth.setRole({ role: selected });
      setUser(user);
      router.replace("/(tabs)/home");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 gap-6 px-6 py-10">
        <Text className="text-3xl font-bold text-ink">{strings.role.title}</Text>

        <View className="gap-3">
          {ROLES.map((role) => (
            <Card
              key={role.value}
              selected={selected === role.value}
              onPress={() => setSelected(role.value)}
            >
              <Text className="text-lg font-semibold text-ink">{role.title}</Text>
              <Text className="mt-1 text-sm text-muted">{role.description}</Text>
            </Card>
          ))}
        </View>

        <View className="flex-1" />

        <Button
          label={strings.role.continue}
          onPress={onContinue}
          disabled={!selected}
          loading={submitting}
        />
      </View>
    </SafeAreaView>
  );
}
