import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useUnreadCount } from "../../features";
import { colors } from "../../theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(outline: IconName, filled: IconName) {
  function TabIcon({ focused, color, size }: { focused: boolean; color: string; size: number }) {
    return <Ionicons name={focused ? filled : outline} color={color} size={size} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const unreadCount = useUnreadCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: "Home", tabBarIcon: tabIcon("home-outline", "home") }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: "Discover", tabBarIcon: tabIcon("compass-outline", "compass") }}
      />
      <Tabs.Screen
        name="projects"
        options={{ title: "Projects", tabBarIcon: tabIcon("briefcase-outline", "briefcase") }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: tabIcon("chatbubbles-outline", "chatbubbles"),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{ title: "Wallet", tabBarIcon: tabIcon("wallet-outline", "wallet") }}
      />
    </Tabs>
  );
}
