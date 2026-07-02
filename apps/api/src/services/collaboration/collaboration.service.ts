import { prisma } from '../../config/db.js';

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
) {
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
    await notifyMentionedUsers(
      input.mentions,
      userId,
      input.content,
      input.dashboardId,
    );
  }

  return {
    ...comment,
    mentions: comment.mentions ? JSON.parse(comment.mentions) : [],
  };
}

export async function getComments(
  dashboardId: string,
  widgetId?: string,
) {
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

  return comments.map(c => ({
    ...c,
    mentions: c.mentions ? JSON.parse(c.mentions) : [],
    replies: c.replies.map(r => ({
      ...r,
      mentions: r.mentions ? JSON.parse(r.mentions) : [],
    })),
  }));
}

export async function deleteComment(
  commentId: string,
  userId: string,
) {
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
) {
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
    dataPointRef: JSON.parse(annotation.dataPointRef),
  };
}

export async function getAnnotations(widgetId: string) {
  const annotations = await prisma.annotation.findMany({
    where: { widgetId },
    include: {
      user: { select: { firstName: true, lastName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return annotations.map(a => ({
    ...a,
    dataPointRef: JSON.parse(a.dataPointRef),
  }));
}

export async function deleteAnnotation(
  annotationId: string,
  userId: string,
) {
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
    console.log(
      `[Mention] ${author?.firstName} ${author?.lastName} mentioned ${user.firstName} ` +
      `in comment: "${commentContent.slice(0, 100)}..." ` +
      `(dashboard: ${dashboardId ?? 'N/A'})`,
    );
  }
}
