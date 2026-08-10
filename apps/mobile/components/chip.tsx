import { Text, View } from "react-native";

export interface ChipProps {
  label: string;
}

export function Chip({ label }: ChipProps) {
  return (
    <View className="rounded-full border border-border bg-background-alt px-3 py-1.5">
      <Text className="text-xs font-medium text-ink">{label}</Text>
    </View>
  );
}
