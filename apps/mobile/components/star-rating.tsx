import { Pressable, Text, View } from "react-native";
import { colors } from "../theme/tokens";

export interface StarRatingProps {
  rating: number;
  size?: number;
  onChange?: (rating: number) => void;
}

const STAR_VALUES = [1, 2, 3, 4, 5];

export function StarRating({ rating, size = 18, onChange }: StarRatingProps) {
  const rounded = Math.round(rating);

  return (
    <View className="flex-row gap-0.5">
      {STAR_VALUES.map((value) => {
        const filled = value <= rounded;
        const star = (
          <Text style={{ fontSize: size, color: filled ? colors.star : colors.border }}>★</Text>
        );

        if (!onChange) {
          return <View key={value}>{star}</View>;
        }

        return (
          <Pressable key={value} onPress={() => onChange(value)} hitSlop={4}>
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}
