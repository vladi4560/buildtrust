import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { Professional } from "@buildtrust/shared";
import { formatMoney } from "../lib/format-money";
import { colors } from "../theme/tokens";
import { Avatar } from "./avatar";
import { StarRating } from "./star-rating";

export interface ProCardProps {
  professional: Professional;
}

export function ProCard({ professional }: ProCardProps) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/professional/${professional.id}`)}
      className="flex-row items-center gap-3 border-b border-border py-3.5"
    >
      <Avatar name={professional.fullName} imageUrl={professional.avatarUrl} size={48} />
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-base font-semibold text-ink">{professional.fullName}</Text>
          {professional.verified ? (
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          ) : null}
        </View>
        <Text className="text-sm text-muted">{professional.specialty}</Text>
        <View className="mt-1 flex-row items-center gap-1.5">
          <StarRating rating={professional.rating} size={12} />
          <Text className="text-xs text-muted">({professional.reviewCount})</Text>
        </View>
      </View>
      <View className="items-end">
        <Text className="text-sm font-semibold text-ink">
          {formatMoney(professional.dailyRate)}
        </Text>
        <Text className="text-xs text-muted">/day</Text>
      </View>
    </Pressable>
  );
}
