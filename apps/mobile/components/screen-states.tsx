import { ActivityIndicator, Text, View } from "react-native";
import { colors } from "../theme/tokens";

export function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = "Something went wrong.", onRetry }: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-6 py-16">
      <Text className="text-center text-sm text-muted">{message}</Text>
      {onRetry ? (
        <Text className="text-sm font-medium text-accent" onPress={onRetry}>
          Try again
        </Text>
      ) : null}
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-16">
      <Text className="text-center text-sm text-muted">{message}</Text>
    </View>
  );
}
