import { View } from "react-native";

export interface ProgressBarProps {
  percent: number;
}

export function ProgressBar({ percent }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View className="h-2 w-full overflow-hidden rounded-full bg-background-alt">
      <View className="h-full rounded-full bg-primary" style={{ width: `${clamped}%` }} />
    </View>
  );
}
