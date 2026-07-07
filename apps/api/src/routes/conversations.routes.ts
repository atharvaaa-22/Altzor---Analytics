import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { queryLimiter } from '../middleware/rateLimiter.js';
import { processQuestion } from '../services/query/conversationService.js';

const router = Router();
router.use(authMiddleware);

router.post('/', async (req: Request, res: Response) => {
  const { connectionId: rawConnectionId } = z
    .object({
      connectionId: z.string().optional(),
    })
    .parse(req.body);

  // 'default' and 'local' are virtual SQLite connections — not real DB records.
  // Store null so the FK to DatabaseConnection is satisfied.
  const connectionId =
    rawConnectionId === 'default' || rawConnectionId === 'local' ? undefined : rawConnectionId;

  const conversation = await prisma.conversation.create({
    data: {
      userId: req.user!.userId,
      organizationId: req.user!.organizationId,
      connectionId,
    },
  });

  res.status(201).json({ id: conversation.id });
});

router.get('/', async (req: Request, res: Response) => {
  const querySchema = z.object({
    search: z.string().optional(),
    page: z.string().default('1'),
    limit: z.string().default('20'),
  });
  const { search, page, limit } = querySchema.parse(req.query);

  const where = {
    userId: req.user!.userId,
    organizationId: req.user!.organizationId,
    isArchived: false,
    ...(search ? { title: { contains: search } } : {}),
  };

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        connection: { select: { name: true, type: true } },
      },
    }),
    prisma.conversation.count({ where }),
  ]);

  res.json({ conversations, total, page: parseInt(page), limit: parseInt(limit) });
});

const messageSchema = z.object({
  question: z.string().min(1).max(5000),
  connectionId: z.string(),
});

router.post('/:id/messages', queryLimiter, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { question, connectionId } = messageSchema.parse(req.body);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const sendEvent = (event: string, data: unknown): void => {
      const payload = JSON.stringify(data, (_key, val: unknown) =>
        typeof val === 'bigint' ? Number(val) : val,
      );
      res.write(`event: ${event}\ndata: ${payload}\n\n`);
    };

    sendEvent('status', { stage: 'fetching_schema', message: 'Loading database schema...' });

    sendEvent('status', { stage: 'generating_sql', message: 'AI is generating SQL...' });

    const result = await processQuestion(
      req.params.id,
      connectionId,
      question,
      req.user!.userId,
      req.user!.organizationId,
    );

    sendEvent('sql', { sql: result.sql, explanation: result.explanation });
    sendEvent('status', { stage: 'executing', message: 'Running query...' });

    sendEvent('results', {
      rows: result.results,
      columns: result.columns,
      rowCount: result.rowCount,
      executionTimeMs: result.executionTimeMs,
      costEstimate: result.costEstimate,
      cached: result.cached,
    });

    sendEvent('chart', { chartType: result.chartType });

    sendEvent('narrative', {
      summary: result.narrative.summary,
      confidence: result.narrative.confidence,
      keyFindings: result.narrative.keyFindings,
    });

    sendEvent('lineage', result.lineage);

    if (result.warnings.length > 0) {
      sendEvent('warnings', { warnings: result.warnings });
    }

    sendEvent('complete', { messageId: result.messageId });
    res.end();
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    res.write(
      `event: error\ndata: ${JSON.stringify({ error: (error as Error).message, status })}\n\n`,
    );
    res.end();
  }
});

router.get('/:id/messages', async (req: Request<{ id: string }>, res: Response) => {
  const messages = await prisma.message.findMany({
    where: { conversationId: req.params.id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      content: true,
      generatedSql: true,
      queryResults: true,
      resultMetadata: true,
      chartType: true,
      chartOverride: true,
      narrativeSummary: true,
      confidenceScore: true,
      lineage: true,
      aiModel: true,
      createdAt: true,
      feedback: { select: { type: true } },
    },
  });

  const parsedMessages = messages.map((msg) => ({
    ...msg,
    queryResults: msg.queryResults
      ? (JSON.parse(msg.queryResults) as Record<string, unknown>[])
      : null,
    resultMetadata: msg.resultMetadata
      ? (JSON.parse(msg.resultMetadata) as Record<string, unknown>)
      : null,
    lineage: msg.lineage ? (JSON.parse(msg.lineage) as Record<string, unknown>) : null,
  }));

  res.json({ messages: parsedMessages });
});

const feedbackSchema = z.object({
  type: z.enum(['THUMBS_UP', 'THUMBS_DOWN']),
  comment: z.string().optional(),
});

router.post(
  '/:id/messages/:msgId/feedback',
  async (req: Request<{ id: string; msgId: string }>, res: Response) => {
    const { type, comment } = feedbackSchema.parse(req.body);

    const feedback = await prisma.queryFeedback.upsert({
      where: { messageId: req.params.msgId },
      update: { type, comment },
      create: {
        messageId: req.params.msgId,
        userId: req.user!.userId,
        type,
        comment,
      },
    });

    res.json(feedback);
  },
);

export { router as conversationRoutes };
