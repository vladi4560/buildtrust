import { Text, View } from "react-native";

export interface RatingBreakdownProps {
  breakdown: Record<"5" | "4" | "3" | "2" | "1", number>;
}

const LEVELS = [5, 4, 3, 2, 1] as const;

export function RatingBreakdown({ breakdown }: RatingBreakdownProps) {
  const total = LEVELS.reduce((sum, level) => sum + breakdown[String(level) as "5"], 0);

  return (
    <View className="gap-2">
      {LEVELS.map((level) => {
        const count = breakdown[String(level) as "5"];
        const percent = total === 0 ? 0 : (count / total) * 100;
        return (
          <View key={level} className="flex-row items-center gap-2">
            <Text className="w-3 text-xs font-medium text-muted">{level}</Text>
            <View className="h-2 flex-1 overflow-hidden rounded-full bg-background-alt">
              <View className="h-full rounded-full bg-star" style={{ width: `${percent}%` }} />
            </View>
            <Text className="w-8 text-right text-xs text-muted">{count}</Text>
          </View>
        );
      })}
    </View>
  );
}
