import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { processFileUpload, deleteUploadedFile, FileFormat } from '../services/files/fileUpload.service.js';
import { env } from '../config/env.js';

const router = Router();
router.use(authMiddleware);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.json', '.pdf'];
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (ext && allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file format: ${ext}. Allowed: ${allowed.join(', ')}`));
    }
  },
});

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const ext = req.file.originalname.split('.').pop()?.toUpperCase() as FileFormat;
    const format = ext === 'XLSX' ? 'XLSX' : ext as FileFormat;

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
      message: 'File uploaded and ready for querying',
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

  const serialized = files.map(f => ({
    ...f,
    sizeBytes: f.sizeBytes.toString(),
    columnSchema: f.columnSchema ? JSON.parse(f.columnSchema) : null
  }));

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
