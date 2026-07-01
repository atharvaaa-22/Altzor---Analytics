# Skill File 09 — File Upload & Ad-hoc Querying

## Overview
Implement file upload (CSV, XLSX, JSON, PDF) with S3 storage, automatic schema inference, ephemeral MySQL table creation, and virtual table integration into the schema selector. Users can query uploaded files just like connected database tables.

**BRD References:** REQ-FUA-001–011, Section 5.2.2 (Data Ingestion Pipeline)

---

## 1. File Upload Service — `apps/api/src/services/files/fileUpload.service.ts`

```typescript
/**
 * fileUpload.service.ts — File upload, parsing, schema inference, ephemeral tables.
 *
 * REQ-FUA-001: CSV, XLSX, JSON, PDF formats.
 * REQ-FUA-003: S3 storage.
 * REQ-FUA-004: Ephemeral MySQL tables (upload_ prefix).
 * REQ-FUA-005: Auto-detect columns, infer types, sample values.
 * REQ-FUA-010: Max 500 MB file size.
 * REQ-FUA-011: Max 5M rows in memory; stream if exceeded.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { parse as csvParse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import pdfParse from 'pdf-parse';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { FileFormat } from '@prisma/client';

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      }
    : undefined,
});

// ─── Types ─────────────────────────────────────────────────────────
interface InferredColumn {
  name: string;
  dataType: 'VARCHAR(500)' | 'INT' | 'BIGINT' | 'DOUBLE' | 'DATE' | 'DATETIME' | 'TEXT' | 'BOOLEAN';
  sampleValues: string[];
  nullable: boolean;
}

interface ParsedFile {
  columns: InferredColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

// ─── Upload to S3 ──────────────────────────────────────────────────
async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ServerSideEncryption: 'AES256', // NFR-SEC-001: Encryption at rest
    }),
  );
}

// ─── Delete from S3 ────────────────────────────────────────────────
async function deleteFromS3(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }),
  );
}

// ─── Parse File Based on Format ────────────────────────────────────
export async function parseFile(
  buffer: Buffer,
  format: FileFormat,
  filename: string,
): Promise<ParsedFile> {
  switch (format) {
    case 'CSV':
      return parseCsv(buffer);
    case 'XLSX':
      return parseXlsx(buffer);
    case 'JSON':
      return parseJson(buffer);
    case 'PDF':
      return parsePdf(buffer, filename);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

// ─── CSV Parser ────────────────────────────────────────────────────
function parseCsv(buffer: Buffer): ParsedFile {
  const content = buffer.toString('utf-8');
  const records: Record<string, string>[] = csvParse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    cast: false,
  });

  if (records.length === 0) throw new Error('CSV file is empty');

  const columns = Object.keys(records[0]!).map((name) =>
    inferColumn(name, records.map((r) => r[name] ?? '')),
  );

  return { columns, rows: records, rowCount: records.length };
}

// ─── XLSX Parser ───────────────────────────────────────────────────
function parseXlsx(buffer: Buffer): ParsedFile {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Excel file has no sheets');

  const sheet = workbook.Sheets[sheetName]!;
  const records: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (records.length === 0) throw new Error('Excel sheet is empty');

  const columns = Object.keys(records[0]!).map((name) =>
    inferColumn(name, records.map((r) => String(r[name] ?? ''))),
  );

  return { columns, rows: records, rowCount: records.length };
}

// ─── JSON Parser ───────────────────────────────────────────────────
function parseJson(buffer: Buffer): ParsedFile {
  const content = buffer.toString('utf-8');
  let parsed: unknown = JSON.parse(content);

  // Handle array or single object
  if (!Array.isArray(parsed)) {
    parsed = [parsed];
  }

  const records = parsed as Record<string, unknown>[];
  if (records.length === 0) throw new Error('JSON file has no records');

  const columns = Object.keys(records[0]!).map((name) =>
    inferColumn(name, records.map((r) => String(r[name] ?? ''))),
  );

  return { columns, rows: records, rowCount: records.length };
}

// ─── PDF Parser (Text Extraction) ──────────────────────────────────
// REQ-FUA-002: Text extraction via pdf-parse.
async function parsePdf(buffer: Buffer, filename: string): ParsedFile {
  const data = await pdfParse(buffer);
  const text = data.text.trim();

  if (!text) throw new Error('Could not extract text from PDF');

  // Store as single-column text table
  const lines = text.split('\n').filter((l) => l.trim());
  const rows = lines.map((line, idx) => ({
    line_number: idx + 1,
    content: line.trim(),
  }));

  return {
    columns: [
      { name: 'line_number', dataType: 'INT', sampleValues: ['1', '2', '3'], nullable: false },
      { name: 'content', dataType: 'TEXT', sampleValues: lines.slice(0, 5), nullable: false },
    ],
    rows,
    rowCount: rows.length,
  };
}

// ─── Type Inference ────────────────────────────────────────────────
function inferColumn(name: string, values: string[]): InferredColumn {
  const nonEmpty = values.filter((v) => v !== '' && v !== null && v !== undefined);
  const nullable = nonEmpty.length < values.length;
  const samples = [...new Set(nonEmpty)].slice(0, 5); // REQ-FUA-005: 5 samples

  // Sanitize column name
  const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

  // Check if all values are integers
  if (nonEmpty.every((v) => /^-?\d+$/.test(v))) {
    const maxVal = Math.max(...nonEmpty.map(Number));
    return {
      name: safeName,
      dataType: maxVal > 2_147_483_647 ? 'BIGINT' : 'INT',
      sampleValues: samples,
      nullable,
    };
  }

  // Check if all values are numbers (decimal)
  if (nonEmpty.every((v) => /^-?\d+\.?\d*$/.test(v))) {
    return { name: safeName, dataType: 'DOUBLE', sampleValues: samples, nullable };
  }

  // Check if all values are booleans
  if (nonEmpty.every((v) => ['true', 'false', '1', '0', 'yes', 'no'].includes(v.toLowerCase()))) {
    return { name: safeName, dataType: 'BOOLEAN', sampleValues: samples, nullable };
  }

  // Check if all values are dates
  if (nonEmpty.every((v) => !isNaN(Date.parse(v)) && v.length > 6)) {
    return { name: safeName, dataType: 'DATETIME', sampleValues: samples, nullable };
  }

  // Default to VARCHAR/TEXT
  const maxLen = Math.max(...nonEmpty.map((v) => v.length));
  return {
    name: safeName,
    dataType: maxLen > 500 ? 'TEXT' : 'VARCHAR(500)',
    sampleValues: samples,
    nullable,
  };
}

// ─── Create Ephemeral Table ────────────────────────────────────────
// REQ-FUA-004: Ephemeral MySQL table prefixed with upload_.
// ARC-DB-003: Dynamic creation with indexing.
async function createEphemeralTable(
  tableName: string,
  columns: InferredColumn[],
  rows: Record<string, unknown>[],
): Promise<void> {
  const columnDefs = columns
    .map((c) => `\`${c.name}\` ${c.dataType}${c.nullable ? '' : ' NOT NULL'}`)
    .join(',\n  ');

  // Create table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      \`_row_id\` INT AUTO_INCREMENT PRIMARY KEY,
      ${columnDefs}
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Insert rows in batches of 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const colNames = columns.map((c) => `\`${c.name}\``).join(', ');
    const placeholders = batch
      .map(() => `(${columns.map(() => '?').join(', ')})`)
      .join(', ');

    const values = batch.flatMap((row) =>
      columns.map((c) => row[c.name] ?? null),
    );

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${tableName}\` (${colNames}) VALUES ${placeholders}`,
      ...values,
    );
  }
}

// ─── Main Upload Handler ───────────────────────────────────────────
export async function processFileUpload(
  buffer: Buffer,
  originalName: string,
  format: FileFormat,
  userId: string,
  orgId: string,
): Promise<{
  fileId: string;
  tableName: string;
  columns: InferredColumn[];
  rowCount: number;
}> {
  // REQ-FUA-010: Max 500 MB
  if (buffer.length > env.MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new Error(`File exceeds maximum size of ${env.MAX_FILE_SIZE_MB} MB`);
  }

  // Step 1: Upload to S3 (REQ-FUA-003)
  const s3Key = `uploads/${orgId}/${Date.now()}_${originalName}`;
  await uploadToS3(buffer, s3Key, getMimeType(format));

  // Step 2: Parse file & infer schema (REQ-FUA-005)
  const parsed = await parseFile(buffer, format, originalName);

  // REQ-FUA-011: Check row count
  if (parsed.rowCount > env.MAX_ROW_COUNT) {
    throw new Error(
      `File has ${parsed.rowCount} rows, exceeding the ${env.MAX_ROW_COUNT} row limit.`,
    );
  }

  // Step 3: Create ephemeral table (REQ-FUA-004)
  const tableName = `upload_${orgId.slice(0, 8)}_${Date.now()}`;
  await createEphemeralTable(tableName, parsed.columns, parsed.rows);

  // Step 4: Save metadata
  const file = await prisma.uploadedFile.create({
    data: {
      originalName,
      format,
      sizeBytes: buffer.length,
      s3Key,
      s3Bucket: env.S3_BUCKET,
      ephemeralTable: tableName,
      columnSchema: parsed.columns,
      rowCount: parsed.rowCount,
      userId,
      organizationId: orgId,
    },
  });

  return {
    fileId: file.id,
    tableName,
    columns: parsed.columns,
    rowCount: parsed.rowCount,
  };
}

// ─── Delete File (REQ-FUA-009) ─────────────────────────────────────
export async function deleteUploadedFile(fileId: string): Promise<void> {
  const file = await prisma.uploadedFile.findUniqueOrThrow({
    where: { id: fileId },
  });

  // Delete S3 object
  await deleteFromS3(file.s3Key);

  // Drop ephemeral table
  if (file.ephemeralTable) {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${file.ephemeralTable}\``);
  }

  // Soft delete record
  await prisma.uploadedFile.update({
    where: { id: fileId },
    data: { isDeleted: true },
  });
}

function getMimeType(format: FileFormat): string {
  const map: Record<FileFormat, string> = {
    CSV: 'text/csv',
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    JSON: 'application/json',
    PDF: 'application/pdf',
  };
  return map[format];
}
```

---

## 2. File Upload Routes — `apps/api/src/routes/files.routes.ts`

```typescript
/**
 * files.routes.ts — File upload and management API.
 *
 * REQ-FUA-006: Progress bar, validation errors shown inline.
 * REQ-FUA-007: Uploaded files appear as virtual tables in schema selector.
 * REQ-FUA-008: File sharing with org members.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { FileFormat } from '@prisma/client';
import { prisma } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { processFileUpload, deleteUploadedFile } from '../services/files/fileUpload.service.js';
import { env } from '../config/env.js';

const router = Router();
router.use(authMiddleware);

// Multer config — in-memory buffer for parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, // REQ-FUA-010
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.json', '.pdf'];
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (ext && allowed.includes(`.${ext}`)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file format: .${ext}. Allowed: ${allowed.join(', ')}`));
    }
  },
});

// ─── POST /api/files/upload ────────────────────────────────────────
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
    // REQ-FUA-006: Inline validation errors
    res.status(400).json({ error: (error as Error).message });
  }
});

// ─── GET /api/files — List uploaded files ──────────────────────────
// REQ-FUA-007: Appear as virtual tables in schema selector.
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

  res.json(files);
});

// ─── DELETE /api/files/:id — Delete file (REQ-FUA-009, Admin only) ─
router.delete('/:id', rbac('ORG_ADMIN'), async (req: Request, res: Response) => {
  try {
    await deleteUploadedFile(req.params.id);
    res.json({ message: 'File deleted and data purged' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export { router as fileRoutes };
```

---

## 3. Verification Checklist

| Step | Action | Expected |
|------|--------|----------|
| Upload CSV | `POST /api/files/upload` with CSV | 201 + columns inferred |
| Upload XLSX | Upload Excel file | Columns and types auto-detected |
| Upload JSON | Upload JSON array | Ephemeral table created |
| Upload PDF | Upload PDF | Text extracted into content column |
| Too large | Upload 600 MB file | 400 "exceeds maximum size" |
| Wrong format | Upload .exe file | 400 "Unsupported format" |
| Schema selector | `GET /api/files` | Files listed with `ephemeralTable` |
| Query virtual table | Ask about uploaded data | AI queries ephemeral table |
| Delete file | `DELETE /api/files/:id` | S3 purged + table dropped |
| File validation | Malformed CSV | 400 with inline error |

---

## Next Skill → `10_saved_queries_skill.md`
