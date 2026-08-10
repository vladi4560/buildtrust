import { ActivityIndicator, Pressable, Text } from "react-native";
import { colors } from "../theme/tokens";

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "filled" | "outline";
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ label, onPress, variant = "filled", disabled, loading }: ButtonProps) {
  const isFilled = variant === "filled";
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`items-center justify-center rounded-xl px-6 py-4 ${
        isFilled ? "bg-primary" : "border border-primary bg-transparent"
      } ${isDisabled ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={isFilled ? "#FFFFFF" : colors.primary} />
      ) : (
        <Text className={`text-base font-semibold ${isFilled ? "text-white" : "text-primary"}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
