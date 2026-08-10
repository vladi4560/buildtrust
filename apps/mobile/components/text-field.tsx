import { useState } from "react";
import { Text, TextInput, TextInputProps, Pressable, View } from "react-native";
import { colors } from "../theme/tokens";

export interface TextFieldProps extends Omit<TextInputProps, "secureTextEntry"> {
  label: string;
  error?: string;
  secureToggle?: boolean;
}

export function TextField({ label, error, secureToggle, ...inputProps }: TextFieldProps) {
  const [hidden, setHidden] = useState(secureToggle);

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-ink">{label}</Text>
      <View className="flex-row items-center rounded-xl border border-border bg-white px-4">
        <TextInput
          {...inputProps}
          secureTextEntry={hidden}
          placeholderTextColor={colors.muted}
          className="flex-1 py-3.5 text-base text-ink"
        />
        {secureToggle ? (
          <Pressable onPress={() => setHidden((value) => !value)} hitSlop={8}>
            <Text className="text-sm font-medium text-accent">{hidden ? "Show" : "Hide"}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="text-sm text-outgoing">{error}</Text> : null}
    </View>
  );
}
