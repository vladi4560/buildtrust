import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Professional } from "@buildtrust/shared";
import { Avatar } from "./avatar";
import { Card } from "./card";
import { StarRating } from "./star-rating";

export interface ProfessionalCardProps {
  professional: Professional;
}

export function ProfessionalCard({ professional }: ProfessionalCardProps) {
  const router = useRouter();

  return (
    <Card onPress={() => router.push(`/professional/${professional.id}`)}>
      <View className="flex-row items-center gap-3">
        <Avatar name={professional.fullName} imageUrl={professional.avatarUrl} size={48} />
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-semibold text-ink">{professional.fullName}</Text>
            {professional.verified ? (
              <Text className="text-xs font-medium text-success">Verified</Text>
            ) : null}
          </View>
          <Text className="text-sm text-muted">{professional.specialty}</Text>
          <View className="mt-1 flex-row items-center gap-2">
            <StarRating rating={professional.rating} size={12} />
            <Text className="text-xs text-muted">({professional.reviewCount})</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}
