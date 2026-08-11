import { z } from "zod";

export const createConversationBodySchema = z.object({
  participantId: z.string(),
  projectId: z.string().optional(),
});
export type CreateConversationBody = z.infer<typeof createConversationBodySchema>;

export const conversationIdParamsSchema = z.object({ id: z.string() });

const conversationParticipantSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  avatarUrl: z.string().nullable(),
});

const conversationProjectContextSchema = z.object({
  id: z.string(),
  title: z.string(),
});

// Returned by POST /conversations and embedded in each GET /conversations row -
// enough for the thread header, so the mobile client never needs a GET /conversations/:id.
export const conversationDetailSchema = z.object({
  id: z.string(),
  otherParticipant: conversationParticipantSchema,
  project: conversationProjectContextSchema.nullable(),
});
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;

export const conversationSummarySchema = conversationDetailSchema.extend({
  lastMessageAt: z.coerce.date(),
  lastMessagePreview: z.string().nullable(),
  lastMessageMine: z.boolean(),
  unreadCount: z.number().int(),
});
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;

export const conversationsResponseSchema = z.array(conversationSummarySchema);

export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  body: z.string(),
  createdAt: z.coerce.date(),
});
export type MessageResponse = z.infer<typeof messageSchema>;

export const messagesQuerySchema = z.object({
  before: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
export type MessagesQuery = z.infer<typeof messagesQuerySchema>;

export const messagesPageSchema = z.object({
  messages: z.array(messageSchema),
  hasMore: z.boolean(),
});
export type MessagesPage = z.infer<typeof messagesPageSchema>;

export const sendMessageBodySchema = z.object({
  body: z.string().min(1).max(4000),
});
export type SendMessageBody = z.infer<typeof sendMessageBodySchema>;
