import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Avatar, ErrorState, LoadingState } from "../../components";
import { useMarkRead, useMessages, useSendMessage } from "../../features";
import { formatDaySeparator, formatMessageTime, useAuthStore } from "../../lib";
import { colors } from "../../theme/tokens";

export default function ConversationThread() {
  const { id, otherName, otherAvatarUrl, projectId, projectTitle } = useLocalSearchParams<{
    id: string;
    otherName?: string;
    otherAvatarUrl?: string;
    projectId?: string;
    projectTitle?: string;
  }>();
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const messagesQuery = useMessages(id);
  const sendMessage = useSendMessage(id);
  const markRead = useMarkRead();

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    markRead.mutate(id);
    // Marks read once per thread visit; markRead is a stable mutation reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const messages = useMemo(
    () =>
      messagesQuery.data?.pages
        .slice()
        .reverse()
        .flatMap((page) => page.messages) ?? [],
    [messagesQuery.data],
  );

  const handleSend = () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    sendMessage.mutate({ body });
  };

  if (messagesQuery.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (messagesQuery.isError) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ErrorState
          message="Couldn't load this conversation."
          onRetry={() => messagesQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  let lastDay: string | null = null;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center gap-3 border-b border-border px-6 py-3">
        <Text className="text-sm font-medium text-muted" onPress={() => router.back()}>
          Back
        </Text>
        <Avatar name={otherName ?? ""} imageUrl={otherAvatarUrl || undefined} size={36} />
        <View className="flex-1">
          <Text className="text-base font-semibold text-ink" numberOfLines={1}>
            {otherName}
          </Text>
          {projectId ? (
            <Text
              className="text-xs font-medium text-accent"
              numberOfLines={1}
              onPress={() => router.push(`/project/${projectId}`)}
            >
              {projectTitle}
            </Text>
          ) : null}
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerClassName="gap-2 px-6 py-4"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messagesQuery.hasNextPage ? (
            <Text
              className="mb-2 text-center text-sm font-medium text-accent"
              onPress={() => messagesQuery.fetchNextPage()}
            >
              {messagesQuery.isFetchingNextPage ? "Loading..." : "Load earlier messages"}
            </Text>
          ) : null}

          {messages.map((message) => {
            const day = formatDaySeparator(message.createdAt);
            const showSeparator = day !== lastDay;
            lastDay = day;
            const mine = message.senderId === currentUserId;

            return (
              <View key={message.id}>
                {showSeparator ? (
                  <View className="my-3 items-center">
                    <Text className="rounded-full bg-background-alt px-3 py-1 text-xs font-medium text-muted">
                      {day}
                    </Text>
                  </View>
                ) : null}
                <View
                  className={`max-w-[80%] ${mine ? "items-end self-end" : "items-start self-start"}`}
                >
                  <View
                    className={`rounded-2xl px-4 py-2.5 ${mine ? "bg-primary" : "bg-background-alt"}`}
                  >
                    <Text className={mine ? "text-white" : "text-ink"}>{message.body}</Text>
                  </View>
                  <Text className="mt-1 text-[10px] text-muted">
                    {formatMessageTime(message.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View className="flex-row items-end gap-2 border-t border-border px-4 py-3">
          <View className="flex-1 rounded-2xl border border-border bg-white px-4 py-2.5">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Message"
              placeholderTextColor={colors.muted}
              multiline
              className="max-h-24 text-base text-ink"
            />
          </View>
          <Pressable
            onPress={handleSend}
            disabled={!draft.trim()}
            className={`h-11 w-11 items-center justify-center rounded-full ${
              draft.trim() ? "bg-primary" : "bg-border"
            }`}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
