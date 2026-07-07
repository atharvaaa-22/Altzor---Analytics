import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { encrypt } from '../utils/crypto.js';
import {
  getConnector,
  removeConnector,
  testRawConnection,
  type ConnectionType,
} from '../services/connectors/connectionFactory.js';
import { refreshSchemaCache, getSchemaMetadata } from '../services/connectors/schemaCache.js';

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['POSTGRESQL', 'MYSQL', 'MSSQL', 'SNOWFLAKE', 'BIGQUERY', 'MONGODB']),
  host: z.string().optional(),
  port: z.number().optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  connectionString: z.string().optional(),
  sslEnabled: z.boolean().default(true),
});

router.post('/', rbac('ORG_ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = createSchema.parse(req.body);

    let encryptedPassword: string | undefined;
    let encryptionIV: string | undefined;
    let encryptionTag: string | undefined;

    if (data.password) {
      const encrypted = encrypt(data.password);
      encryptedPassword = encrypted.ciphertext;
      encryptionIV = encrypted.iv;
      encryptionTag = encrypted.tag;
    }

    const connection = await prisma.databaseConnection.create({
      data: {
        name: data.name,
        type: data.type,
        host: data.host,
        port: data.port,
        database: data.database,
        username: data.username,
        encryptedPassword,
        encryptionIV,
        encryptionTag,
        connectionString: data.connectionString,
        sslEnabled: data.sslEnabled,
        organizationId: req.user!.organizationId,
      },
    });

    res.status(201).json({ id: connection.id, name: connection.name, type: connection.type });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/test', rbac('ORG_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { type, config } = req.body as { type: ConnectionType; config: Record<string, unknown> };
    if (!type || !config) {
      return res.status(400).json({ success: false, message: 'Type and config are required' });
    }

    const isHealthy = await testRawConnection(type, config);
    res.json({ success: isHealthy });
  } catch (error) {
    res.json({ success: false, message: (error as Error).message });
  }
});

router.post('/:id/test', rbac('ORG_ADMIN'), async (req: Request<{ id: string }>, res: Response) => {
  try {
    const connector = await getConnector(req.params.id);
    const isHealthy = await connector.testConnection();

    await prisma.databaseConnection.update({
      where: { id: req.params.id },
      data: { lastTestedAt: new Date() },
    });

    res.json({ healthy: isHealthy });
  } catch (error) {
    res.json({ healthy: false, error: (error as Error).message });
  }
});

router.get('/:id/schema', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const metadata = await getSchemaMetadata(req.params.id);
    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post(
  '/:id/schema/refresh',
  rbac('ORG_ADMIN'),
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const metadata = await refreshSchemaCache(req.params.id);
      res.json(metadata);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

router.delete('/:id', rbac('ORG_ADMIN'), async (req: Request<{ id: string }>, res: Response) => {
  try {
    await removeConnector(req.params.id);
    await prisma.databaseConnection.delete({ where: { id: req.params.id } });
    res.json({ message: 'Connection deleted' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export { router as connectionRoutes };
