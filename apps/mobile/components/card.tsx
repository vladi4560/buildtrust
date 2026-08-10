import type { PropsWithChildren } from "react";
import { Pressable, View } from "react-native";

export interface CardProps extends PropsWithChildren {
  onPress?: () => void;
  selected?: boolean;
  className?: string;
}

export function Card({ children, onPress, selected, className = "" }: CardProps) {
  const style = `rounded-2xl border bg-white p-4 shadow-sm ${
    selected ? "border-primary" : "border-border"
  } ${className}`;

  if (onPress) {
    return (
      <Pressable onPress={onPress} className={style}>
        {children}
      </Pressable>
    );
  }

  return <View className={style}>{children}</View>;
}
