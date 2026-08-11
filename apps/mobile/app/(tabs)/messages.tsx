import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { ConversationSummary } from "@buildtrust/shared";
import { Avatar, EmptyState, ErrorState, LoadingState } from "../../components";
import { useConversations } from "../../features";
import { formatRelativeTime } from "../../lib";

function ConversationRow({ conversation }: { conversation: ConversationSummary }) {
  const router = useRouter();
  const unread = conversation.unreadCount > 0;

  const preview = conversation.lastMessagePreview
    ? `${conversation.lastMessageMine ? "You: " : ""}${conversation.lastMessagePreview}`
    : "No messages yet";

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/messages/[id]",
          params: {
            id: conversation.id,
            otherName: conversation.otherParticipant.fullName,
            otherAvatarUrl: conversation.otherParticipant.avatarUrl ?? "",
            projectId: conversation.project?.id ?? "",
            projectTitle: conversation.project?.title ?? "",
          },
        })
      }
      className="flex-row items-center gap-3 border-b border-border px-6 py-4"
    >
      <Avatar
        name={conversation.otherParticipant.fullName}
        imageUrl={conversation.otherParticipant.avatarUrl}
        size={48}
      />
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            className={`flex-1 text-base text-ink ${unread ? "font-bold" : "font-medium"}`}
            numberOfLines={1}
          >
            {conversation.otherParticipant.fullName}
          </Text>
          <Text className="text-xs text-muted">
            {formatRelativeTime(conversation.lastMessageAt)}
          </Text>
        </View>
        {conversation.project ? (
          <View className="mt-1 self-start rounded-full bg-background-alt px-2 py-0.5">
            <Text className="text-[10px] font-medium text-muted">{conversation.project.title}</Text>
          </View>
        ) : null}
        <View className="mt-1 flex-row items-center gap-2">
          <Text
            className={`flex-1 text-sm ${unread ? "font-semibold text-ink" : "text-muted"}`}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {unread ? (
            <View className="h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5">
              <Text className="text-xs font-semibold text-white">{conversation.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function Messages() {
  const conversationsQuery = useConversations();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-6 pb-2 pt-6">
        <Text className="text-2xl font-bold text-ink">Messages</Text>
      </View>

      {conversationsQuery.isPending ? (
        <LoadingState />
      ) : conversationsQuery.isError ? (
        <ErrorState
          message="Couldn't load your messages."
          onRetry={() => conversationsQuery.refetch()}
        />
      ) : conversationsQuery.data.length === 0 ? (
        <EmptyState message="No conversations yet." />
      ) : (
        <FlatList
          data={conversationsQuery.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ConversationRow conversation={item} />}
          refreshControl={
            <RefreshControl
              refreshing={conversationsQuery.isRefetching}
              onRefresh={() => conversationsQuery.refetch()}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
