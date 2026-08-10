import { Image } from "expo-image";
import { Text, View } from "react-native";

export interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: number;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function Avatar({ name, imageUrl, size = 48 }: AvatarProps) {
  const style = { width: size, height: size, borderRadius: size / 2 };

  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} style={style} contentFit="cover" />;
  }

  return (
    <View className="items-center justify-center bg-primary" style={style}>
      <Text className="font-semibold text-white" style={{ fontSize: size * 0.4 }}>
        {initials(name)}
      </Text>
    </View>
  );
}
