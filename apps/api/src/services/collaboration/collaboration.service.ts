import { prisma } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import type { Comment, Annotation } from '@prisma/client';

export type CommentResult = Omit<Comment, 'mentions'> & {
  mentions: string[];
  user: { firstName: string | null; lastName: string | null; email: string };
};

export type CommentThreadResult = Omit<Comment, 'mentions'> & {
  mentions: string[];
  user: { firstName: string | null; lastName: string | null; avatarUrl: string | null };
  replies: (Omit<Comment, 'mentions'> & {
    mentions: string[];
    user: { firstName: string | null; lastName: string | null; avatarUrl: string | null };
  })[];
};

export type AnnotationResult = Omit<Annotation, 'dataPointRef'> & {
  dataPointRef: Record<string, unknown>;
  user: { firstName: string | null; lastName: string | null; avatarUrl?: string | null };
};

export interface CreateCommentInput {
  content: string;
  dashboardId?: string;
  widgetId?: string;
  parentId?: string;
  mentions?: string[];
}

export interface CreateAnnotationInput {
  content: string;
  widgetId: string;
  dataPointRef: {
    x?: unknown;
    y?: unknown;
    series?: string;
    value?: unknown;
    label?: string;
  };
}

export async function createComment(
  userId: string,
  input: CreateCommentInput,
): Promise<CommentResult> {
  const comment = await prisma.comment.create({
    data: {
      content: input.content,
      userId,
      dashboardId: input.dashboardId,
      widgetId: input.widgetId,
      parentId: input.parentId,
      mentions: input.mentions ? JSON.stringify(input.mentions) : null,
    },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  if (input.mentions && input.mentions.length > 0) {
    await notifyMentionedUsers(input.mentions, userId, input.content, input.dashboardId);
  }

  return {
    ...comment,
    mentions: comment.mentions ? (JSON.parse(comment.mentions) as string[]) : [],
  };
}

export async function getComments(
  dashboardId: string,
  widgetId?: string,
): Promise<CommentThreadResult[]> {
  const where: Record<string, unknown> = { dashboardId };
  if (widgetId) where['widgetId'] = widgetId;

  const comments = await prisma.comment.findMany({
    where: {
      ...where,
      parentId: null,
    },
    include: {
      user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      replies: {
        include: {
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return comments.map((c) => ({
    ...c,
    mentions: c.mentions ? (JSON.parse(c.mentions) as string[]) : [],
    replies: c.replies.map((r) => ({
      ...r,
      mentions: r.mentions ? (JSON.parse(r.mentions) as string[]) : [],
    })),
  }));
}

export async function deleteComment(commentId: string, userId: string): Promise<void> {
  const comment = await prisma.comment.findUniqueOrThrow({
    where: { id: commentId },
  });

  if (comment.userId !== userId) {
    throw new Error('You can only delete your own comments');
  }

  await prisma.comment.delete({ where: { id: commentId } });
}

export async function createAnnotation(
  userId: string,
  input: CreateAnnotationInput,
): Promise<AnnotationResult> {
  const annotation = await prisma.annotation.create({
    data: {
      content: input.content,
      userId,
      widgetId: input.widgetId,
      dataPointRef: JSON.stringify(input.dataPointRef),
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });

  return {
    ...annotation,
    dataPointRef: JSON.parse(annotation.dataPointRef) as Record<string, unknown>,
  };
}

export async function getAnnotations(widgetId: string): Promise<AnnotationResult[]> {
  const annotations = await prisma.annotation.findMany({
    where: { widgetId },
    include: {
      user: { select: { firstName: true, lastName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return annotations.map((a) => ({
    ...a,
    dataPointRef: JSON.parse(a.dataPointRef) as Record<string, unknown>,
  }));
}

export async function deleteAnnotation(annotationId: string, userId: string): Promise<void> {
  const annotation = await prisma.annotation.findUniqueOrThrow({
    where: { id: annotationId },
  });

  if (annotation.userId !== userId) {
    throw new Error('You can only delete your own annotations');
  }

  await prisma.annotation.delete({ where: { id: annotationId } });
}

async function notifyMentionedUsers(
  mentionedUserIds: string[],
  authorId: string,
  commentContent: string,
  dashboardId?: string,
): Promise<void> {
  const author = await prisma.user.findUnique({
    where: { id: authorId },
    select: { firstName: true, lastName: true },
  });

  const mentionedUsers = await prisma.user.findMany({
    where: { id: { in: mentionedUserIds } },
    select: { id: true, email: true, firstName: true },
  });

  for (const user of mentionedUsers) {
    logger.info(
      `[Mention] ${author?.firstName} ${author?.lastName} mentioned ${user.firstName} ` +
        `in comment: "${commentContent.slice(0, 100)}..." ` +
        `(dashboard: ${dashboardId ?? 'N/A'})`,
    );
  }
}
