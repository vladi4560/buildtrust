import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CreateConversationBody,
  MessageResponse,
  MessagesPage,
  SendMessageBody,
} from "@buildtrust/shared";
import { apiClient } from "../lib/api-client";
import { useAuthStore } from "../lib/auth-store";

// v1 ships polling instead of a WebSocket provider (CLAUDE.md). To swap in
// real-time later: replace these refetchInterval values with a socket
// subscription that calls queryClient.invalidateQueries on push - the query
// keys below don't need to change.
const CONVERSATIONS_POLL_MS = 5000;
const MESSAGES_POLL_MS = 3000;

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => apiClient.conversations.list(),
    refetchInterval: CONVERSATIONS_POLL_MS,
  });
}

export function useUnreadCount() {
  const conversations = useConversations();
  return conversations.data?.reduce((sum, conversation) => sum + conversation.unreadCount, 0) ?? 0;
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateConversationBody) => apiClient.conversations.getOrCreate(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

const messagesQueryKey = (conversationId: string) => ["conversations", conversationId, "messages"];

export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: messagesQueryKey(conversationId),
    queryFn: ({ pageParam }: { pageParam: Date | undefined }) =>
      apiClient.conversations.messages(conversationId, { before: pageParam }),
    initialPageParam: undefined as Date | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.messages[0]?.createdAt : undefined,
    refetchInterval: MESSAGES_POLL_MS,
    enabled: !!conversationId,
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const queryKey = messagesQueryKey(conversationId);

  return useMutation({
    mutationFn: (body: SendMessageBody) => apiClient.conversations.send(conversationId, body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<InfiniteData<MessagesPage>>(queryKey);

      const optimisticMessage: MessageResponse = {
        id: `optimistic-${Date.now()}`,
        conversationId,
        senderId: useAuthStore.getState().user?.id ?? "",
        body: body.body,
        createdAt: new Date(),
      };

      queryClient.setQueryData<InfiniteData<MessagesPage>>(queryKey, (old) => {
        if (!old) {
          return {
            pages: [{ messages: [optimisticMessage], hasMore: false }],
            pageParams: [undefined],
          };
        }
        const [firstPage, ...rest] = old.pages;
        return {
          ...old,
          pages: [{ ...firstPage, messages: [...firstPage.messages, optimisticMessage] }, ...rest],
        };
      });

      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => apiClient.conversations.markRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
