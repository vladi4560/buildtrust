import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { Category } from "@buildtrust/shared";
import { colors } from "../theme/tokens";
import { Card } from "./card";

const FALLBACK_ICON = "construct-outline";

export interface CategoryTileProps {
  category: Category;
}

export function CategoryTile({ category }: CategoryTileProps) {
  const router = useRouter();

  return (
    <Card
      className="w-[31%] items-center gap-2 p-3"
      onPress={() => router.push(`/professionals?category=${category.slug}`)}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Ionicons
          name={(category.icon as keyof typeof Ionicons.glyphMap) ?? FALLBACK_ICON}
          size={20}
          color={colors.primary}
        />
      </View>
      <Text className="text-center text-xs font-medium text-ink" numberOfLines={2}>
        {category.name}
      </Text>
    </Card>
  );
}
