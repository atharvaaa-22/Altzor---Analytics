import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { processFileUpload, deleteUploadedFile } from '../services/files/fileUpload.service.js';
import { env } from '../config/env.js';
import { SUPPORTED_FILE_TYPES, isExtensionAllowed, getFormatFromExtension } from '@platform/shared';

const router = Router();
router.use(authMiddleware);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    const mimeType = file.mimetype;

    const isMimeAllowed = Object.values(SUPPORTED_FILE_TYPES).some((config) =>
      config.mimeTypes.includes(mimeType),
    );

    if (isMimeAllowed || isExtensionAllowed(ext)) {
      cb(null, true);
    } else {
      console.warn(`File rejected: ${file.originalname} (MIME: ${mimeType}, Ext: ${ext})`);
      cb(new Error(`Unsupported file format: ${ext}. MIME type: ${mimeType}`));
    }
  },
});

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const ext = req.file.originalname
      .toLowerCase()
      .substring(req.file.originalname.lastIndexOf('.'));
    const format = getFormatFromExtension(ext);
    if (!format) {
      res.status(400).json({ error: `Could not determine format for ${ext}` });
      return;
    }

    const result = await processFileUpload(
      req.file.buffer,
      req.file.originalname,
      format,
      req.user!.userId,
      req.user!.organizationId,
    );

    res.status(201).json({
      fileId: result.fileId,
      tableName: result.tableName,
      columns: result.columns,
      rowCount: result.rowCount,
      category: result.category,
      queryable: result.queryable,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  const files = await prisma.uploadedFile.findMany({
    where: {
      organizationId: req.user!.organizationId,
      isDeleted: false,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      originalName: true,
      format: true,
      sizeBytes: true,
      ephemeralTable: true,
      columnSchema: true,
      rowCount: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });

  const serialized = files.map((f) => {
    // If the file is tabular, check if ephemeralTable exists. If not tabular, check rowCount.
    const isTabular = ['CSV', 'XLSX', 'XLS', 'JSON'].includes(f.format);
    const isReady = isTabular ? !!f.ephemeralTable : f.rowCount !== null;
    const status = isReady ? 'ready' : 'failed';

    return {
      id: f.id,
      name: f.originalName,
      size: Number(f.sizeBytes),
      type: f.format,
      rowCount: f.rowCount ?? undefined,
      tableName: f.ephemeralTable ?? undefined,
      createdAt: f.createdAt.toISOString(),
      status,
      columnSchema: f.columnSchema ? (JSON.parse(f.columnSchema) as unknown) : null,
      user: f.user,
    };
  });

  res.json(serialized);
});

router.delete('/:id', rbac('ORG_ADMIN'), async (req: Request<{ id: string }>, res: Response) => {
  try {
    await deleteUploadedFile(req.params.id);
    res.json({ message: 'File deleted and data purged' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export { router as fileRoutes };
