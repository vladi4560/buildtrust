import type { PrismaClient } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "../../lib/app-error.js";
import type { CreateConversationBody, MessagesQuery, SendMessageBody } from "@buildtrust/shared";

const participantSelect = { id: true, fullName: true, avatarUrl: true } as const;
const projectSelect = { id: true, title: true } as const;

function toDetail(
  conversation: {
    id: string;
    project: { id: string; title: string } | null;
    participants: {
      userId: string;
      user: { id: string; fullName: string; avatarUrl: string | null };
    }[];
  },
  userId: string,
) {
  const other = conversation.participants.find((p) => p.userId !== userId);
  if (!other) {
    throw new ForbiddenError("You are not a participant in this conversation");
  }
  return {
    id: conversation.id,
    otherParticipant: other.user,
    project: conversation.project,
  };
}

export function createConversationsService(prisma: PrismaClient) {
  return {
    async getOrCreate(userId: string, body: CreateConversationBody) {
      if (body.participantId === userId) {
        throw new ForbiddenError("Cannot start a conversation with yourself");
      }

      const participant = await prisma.user.findUnique({ where: { id: body.participantId } });
      if (!participant) {
        throw new NotFoundError("Participant not found");
      }

      const projectId = body.projectId ?? null;
      const existing = await prisma.conversation.findFirst({
        where: {
          projectId,
          participants: { some: { userId } },
          AND: { participants: { some: { userId: body.participantId } } },
        },
        include: {
          project: { select: projectSelect },
          participants: { include: { user: { select: participantSelect } } },
        },
      });
      if (existing) {
        return toDetail(existing, userId);
      }

      const created = await prisma.conversation.create({
        data: {
          projectId,
          participants: { create: [{ userId }, { userId: body.participantId }] },
        },
        include: {
          project: { select: projectSelect },
          participants: { include: { user: { select: participantSelect } } },
        },
      });
      return toDetail(created, userId);
    },

    async list(userId: string) {
      const conversations = await prisma.conversation.findMany({
        where: { participants: { some: { userId } } },
        include: {
          project: { select: projectSelect },
          participants: { include: { user: { select: participantSelect } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { lastMessageAt: "desc" },
      });

      return Promise.all(
        conversations.map(async (conversation) => {
          const me = conversation.participants.find((p) => p.userId === userId);
          if (!me) {
            throw new ForbiddenError("You are not a participant in this conversation");
          }
          const lastMessage = conversation.messages[0] ?? null;

          const unreadCount = await prisma.message.count({
            where: {
              conversationId: conversation.id,
              senderId: { not: userId },
              createdAt: { gt: me.lastReadAt },
            },
          });

          return {
            ...toDetail(conversation, userId),
            lastMessageAt: conversation.lastMessageAt,
            lastMessagePreview: lastMessage?.body ?? null,
            lastMessageMine: lastMessage?.senderId === userId,
            unreadCount,
          };
        }),
      );
    },

    async assertParticipant(conversationId: string, userId: string) {
      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
      });
      if (!participant) {
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });
        if (!conversation) {
          throw new NotFoundError("Conversation not found");
        }
        throw new ForbiddenError("You are not a participant in this conversation");
      }
      return participant;
    },

    async listMessages(conversationId: string, userId: string, query: MessagesQuery) {
      await this.assertParticipant(conversationId, userId);

      const limit = query.limit ?? 30;
      const page = await prisma.message.findMany({
        where: {
          conversationId,
          ...(query.before ? { createdAt: { lt: query.before } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
      });

      const hasMore = page.length > limit;
      const messages = page.slice(0, limit).reverse();
      return { messages, hasMore };
    },

    async sendMessage(conversationId: string, userId: string, body: SendMessageBody) {
      await this.assertParticipant(conversationId, userId);

      const [message] = await prisma.$transaction([
        prisma.message.create({
          data: { conversationId, senderId: userId, body: body.body },
        }),
        prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        }),
      ]);
      return message;
    },

    async markRead(conversationId: string, userId: string) {
      await this.assertParticipant(conversationId, userId);
      await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: new Date() },
      });
    },
  };
}

export type ConversationsService = ReturnType<typeof createConversationsService>;
