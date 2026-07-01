# Skill File 11 — Collaboration & Annotations

## Overview
Implement collaboration features: threaded comments on dashboards and widgets, data point annotations in visualizations, and @mention notifications. This enables team-based data exploration and insight sharing.

**BRD References:** REQ-COL-001–003

---

## 1. Collaboration Service — `apps/api/src/services/collaboration/collaboration.service.ts`

```typescript
/**
 * collaboration.service.ts — Comments, annotations, and @mentions.
 *
 * REQ-COL-001: Comments on dashboards or individual widgets.
 * REQ-COL-002: Annotate specific data points in visualizations.
 * REQ-COL-003: @mention users to notify them.
 */

import { prisma } from '../../config/db.js';

// ─── Types ─────────────────────────────────────────────────────────
export interface CreateCommentInput {
  content: string;
  dashboardId?: string;
  widgetId?: string;
  parentId?: string;    // For thread replies
  mentions?: string[];  // User IDs to mention
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

// ─── Comments (REQ-COL-001) ────────────────────────────────────────
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
      mentions: input.mentions ?? [],
    },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  // REQ-COL-003: Notify mentioned users
  if (input.mentions && input.mentions.length > 0) {
    await notifyMentionedUsers(
      input.mentions,
      userId,
      input.content,
      input.dashboardId,
    );
  }

  return comment;
}

export async function getComments(
  dashboardId: string,
  widgetId?: string,
) {
  const where: Record<string, unknown> = { dashboardId };
  if (widgetId) where.widgetId = widgetId;

  return prisma.comment.findMany({
    where: {
      ...where,
      parentId: null, // Top-level comments only
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
}

export async function deleteComment(
  commentId: string,
  userId: string,
) {
  const comment = await prisma.comment.findUniqueOrThrow({
    where: { id: commentId },
  });

  // Only the author can delete their own comments
  if (comment.userId !== userId) {
    throw new Error('You can only delete your own comments');
  }

  await prisma.comment.delete({ where: { id: commentId } });
}

// ─── Annotations (REQ-COL-002) ─────────────────────────────────────
export async function createAnnotation(
  userId: string,
  input: CreateAnnotationInput,
) {
  return prisma.annotation.create({
    data: {
      content: input.content,
      userId,
      widgetId: input.widgetId,
      dataPointRef: input.dataPointRef,
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });
}

export async function getAnnotations(widgetId: string) {
  return prisma.annotation.findMany({
    where: { widgetId },
    include: {
      user: { select: { firstName: true, lastName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
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

// ─── @Mention Notifications (REQ-COL-003) ──────────────────────────
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

  // TODO: Integrate with notification system (email via SES, in-app notifications)
  // For now, log the mentions
  for (const user of mentionedUsers) {
    console.log(
      `[Mention] ${author?.firstName} ${author?.lastName} mentioned ${user.firstName} ` +
      `in comment: "${commentContent.slice(0, 100)}..." ` +
      `(dashboard: ${dashboardId ?? 'N/A'})`,
    );
  }
}
```

---

## 2. Collaboration Routes — `apps/api/src/routes/collaboration.routes.ts`

```typescript
/**
 * collaboration.routes.ts — Comments and annotations API.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import {
  createComment, getComments, deleteComment,
  createAnnotation, getAnnotations, deleteAnnotation,
} from '../services/collaboration/collaboration.service.js';

const router = Router();
router.use(authMiddleware);

// ─── Comments ──────────────────────────────────────────────────────

// POST /api/dashboards/:dashId/comments
router.post('/dashboards/:dashId/comments', async (req: Request, res: Response) => {
  const input = z.object({
    content: z.string().min(1).max(5000),
    widgetId: z.string().optional(),
    parentId: z.string().optional(),
    mentions: z.array(z.string()).optional(),
  }).parse(req.body);

  const comment = await createComment(req.user!.userId, {
    ...input,
    dashboardId: req.params.dashId,
  });

  res.status(201).json(comment);
});

// GET /api/dashboards/:dashId/comments
router.get('/dashboards/:dashId/comments', async (req: Request, res: Response) => {
  const widgetId = req.query.widgetId as string | undefined;
  const comments = await getComments(req.params.dashId, widgetId);
  res.json(comments);
});

// DELETE /api/comments/:id
router.delete('/comments/:id', async (req: Request, res: Response) => {
  try {
    await deleteComment(req.params.id, req.user!.userId);
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(403).json({ error: (error as Error).message });
  }
});

// ─── Annotations ───────────────────────────────────────────────────

// POST /api/widgets/:widgetId/annotations
router.post('/widgets/:widgetId/annotations', async (req: Request, res: Response) => {
  const input = z.object({
    content: z.string().min(1).max(2000),
    dataPointRef: z.object({
      x: z.unknown().optional(),
      y: z.unknown().optional(),
      series: z.string().optional(),
      value: z.unknown().optional(),
      label: z.string().optional(),
    }),
  }).parse(req.body);

  const annotation = await createAnnotation(req.user!.userId, {
    ...input,
    widgetId: req.params.widgetId,
  });

  res.status(201).json(annotation);
});

// GET /api/widgets/:widgetId/annotations
router.get('/widgets/:widgetId/annotations', async (req: Request, res: Response) => {
  const annotations = await getAnnotations(req.params.widgetId);
  res.json(annotations);
});

// DELETE /api/annotations/:id
router.delete('/annotations/:id', async (req: Request, res: Response) => {
  try {
    await deleteAnnotation(req.params.id, req.user!.userId);
    res.json({ message: 'Annotation deleted' });
  } catch (error) {
    res.status(403).json({ error: (error as Error).message });
  }
});

export { router as collaborationRoutes };
```

---

## 3. Verification Checklist

| Step | Action | Expected |
|------|--------|----------|
| Add comment | `POST /dashboards/:id/comments` | 201 + comment with user info |
| Thread reply | Comment with `parentId` | Reply nested under parent |
| @mention | Comment with `mentions: [userId]` | Notification logged/sent |
| List comments | `GET /dashboards/:id/comments` | Threaded comments list |
| Delete own comment | `DELETE /comments/:id` | Deleted successfully |
| Delete other's comment | Try deleting other user's | 403 Forbidden |
| Add annotation | `POST /widgets/:id/annotations` with dataPointRef | Annotation on data point |
| List annotations | `GET /widgets/:id/annotations` | All annotations for widget |
| Widget-specific comments | `?widgetId=xyz` on GET | Filtered to that widget |

---

## Next Skill → `12_embedded_analytics_skill.md`
