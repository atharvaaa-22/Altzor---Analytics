import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { parse as csvParse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import type { FileCategory } from '@platform/shared';
import { getFileCategory, isQueryable, SUPPORTED_FILE_TYPES } from '@platform/shared';

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      }
    : undefined,
});

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

async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    }),
  );
}

async function deleteFromS3(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }),
  );
}

export function parseFile(buffer: Buffer, format: string): ParsedFile {
  switch (format) {
    case 'CSV':
      return parseCsv(buffer);
    case 'XLSX':
    case 'XLS':
      return parseXlsx(buffer);
    case 'JSON':
      return parseJson(buffer);
    default:
      throw new Error(`Unsupported tabular format: ${format}`);
  }
}

export async function parseDocument(
  buffer: Buffer,
  format: string,
): Promise<{ text: string; rowCount: number }> {
  let text = '';
  if (format === 'PDF') {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    text = result.text;
  } else if (format === 'DOCX') {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else {
    throw new Error(`Unsupported document format: ${format}`);
  }

  text = text.trim();
  if (!text) throw new Error('Could not extract text from document');

  const rowCount = text.split('\n').filter((l) => l.trim().length > 0).length;
  return { text, rowCount };
}

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
    inferColumn(
      name,
      records.map((r) => r[name] ?? ''),
    ),
  );

  return { columns, rows: records, rowCount: records.length };
}

function parseXlsx(buffer: Buffer): ParsedFile {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Excel file has no sheets');

  const sheet = workbook.Sheets[sheetName]!;
  const records: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (records.length === 0) throw new Error('Excel sheet is empty');

  const columns = Object.keys(records[0]!).map((name) =>
    inferColumn(
      name,
      records.map((r) => String(r[name] ?? '')),
    ),
  );

  return { columns, rows: records, rowCount: records.length };
}

function parseJson(buffer: Buffer): ParsedFile {
  const content = buffer.toString('utf-8');
  let parsed: unknown = JSON.parse(content);

  if (!Array.isArray(parsed)) {
    parsed = [parsed];
  }

  const records = parsed as Record<string, unknown>[];
  if (records.length === 0) throw new Error('JSON file has no records');

  const columns = Object.keys(records[0]!).map((name) =>
    inferColumn(
      name,
      records.map((r) => String(r[name] ?? '')),
    ),
  );

  return { columns, rows: records, rowCount: records.length };
}

function inferColumn(name: string, values: string[]): InferredColumn {
  const nonEmpty = values.filter((v) => v !== '' && v !== null && v !== undefined);
  const nullable = nonEmpty.length < values.length;
  const samples = [...new Set(nonEmpty)].slice(0, 5);

  const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

  if (nonEmpty.length > 0 && nonEmpty.every((v) => /^-?\d+$/.test(v))) {
    const maxVal = Math.max(...nonEmpty.map(Number));
    return {
      name: safeName,
      dataType: maxVal > 2_147_483_647 ? 'BIGINT' : 'INT',
      sampleValues: samples,
      nullable,
    };
  }

  if (nonEmpty.length > 0 && nonEmpty.every((v) => /^-?\d+\.?\d*$/.test(v))) {
    return { name: safeName, dataType: 'DOUBLE', sampleValues: samples, nullable };
  }

  if (
    nonEmpty.length > 0 &&
    nonEmpty.every((v) => ['true', 'false', '1', '0', 'yes', 'no'].includes(v.toLowerCase()))
  ) {
    return { name: safeName, dataType: 'BOOLEAN', sampleValues: samples, nullable };
  }

  if (nonEmpty.length > 0 && nonEmpty.every((v) => !isNaN(Date.parse(v)) && v.length > 6)) {
    return { name: safeName, dataType: 'DATETIME', sampleValues: samples, nullable };
  }

  const maxLen = nonEmpty.length > 0 ? Math.max(...nonEmpty.map((v) => v.length)) : 0;
  return {
    name: safeName,
    dataType: maxLen > 500 ? 'TEXT' : 'VARCHAR(500)',
    sampleValues: samples,
    nullable,
  };
}

async function createEphemeralTable(
  tableName: string,
  columns: InferredColumn[],
  rows: Record<string, unknown>[],
): Promise<void> {
  const columnDefs = columns
    .map((c) => `"${c.name}" ${c.dataType}${c.nullable ? '' : ' NOT NULL'}`)
    .join(',\n  ');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${tableName}" (
      "_row_id" INTEGER PRIMARY KEY AUTOINCREMENT,
      ${columnDefs}
    )
  `);

  const BATCH_SIZE = 500;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const colNames = columns.map((c) => `"${c.name}"`).join(', ');
    const placeholders = batch.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');

    const values = batch.flatMap((row) => columns.map((c) => row[c.name] ?? null));

    await prisma.$executeRawUnsafe(
      `INSERT INTO "${tableName}" (${colNames}) VALUES ${placeholders}`,
      ...values,
    );
  }
}

export async function processFileUpload(
  buffer: Buffer,
  originalName: string,
  format: string,
  userId: string,
  orgId: string,
): Promise<{
  fileId: string;
  tableName: string | null;
  columns: InferredColumn[] | null;
  rowCount: number | null;
  category: FileCategory;
  queryable: boolean;
}> {
  if (buffer.length > env.MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new Error(`File exceeds maximum size of ${env.MAX_FILE_SIZE_MB} MB`);
  }

  const ext = originalName.toLowerCase().substring(originalName.lastIndexOf('.'));
  const category = getFileCategory(ext);
  if (category === null) {
    throw new Error(`Unsupported file extension: ${ext}`);
  }
  const queryable = isQueryable(ext);

  const s3Key = `uploads/${orgId}/${Date.now()}_${originalName}`;
  const mimeType = SUPPORTED_FILE_TYPES[format]?.mimeTypes[0] ?? 'application/octet-stream';
  await uploadToS3(buffer, s3Key, mimeType);

  let parsedColumns: InferredColumn[] | null = null;
  let parsedRowCount: number | null = null;
  let tableName: string | null = null;

  if (category === 'tabular') {
    const parsed = parseFile(buffer, format);

    if (parsed.rowCount > env.MAX_ROW_COUNT) {
      throw new Error(
        `File has ${parsed.rowCount} rows, exceeding the ${env.MAX_ROW_COUNT} row limit.`,
      );
    }

    tableName = `upload_${orgId.slice(0, 8)}_${Date.now()}`;
    await createEphemeralTable(tableName, parsed.columns, parsed.rows);

    parsedColumns = parsed.columns;
    parsedRowCount = parsed.rowCount;
  } else if (category === 'document') {
    const parsedDoc = await parseDocument(buffer, format);
    parsedRowCount = parsedDoc.rowCount;
  }
  // category === 'image': file is stored in S3 as-is; no parsing or table creation.

  const file = await prisma.uploadedFile.create({
    data: {
      originalName,
      format,
      sizeBytes: BigInt(buffer.length),
      s3Key,
      s3Bucket: env.S3_BUCKET,
      ephemeralTable: tableName,
      columnSchema: parsedColumns ? JSON.stringify(parsedColumns) : null,
      rowCount: parsedRowCount,
      userId,
      organizationId: orgId,
    },
  });

  return {
    fileId: file.id,
    tableName,
    columns: parsedColumns,
    rowCount: parsedRowCount,
    category,
    queryable,
  };
}

export async function deleteUploadedFile(fileId: string): Promise<void> {
  const file = await prisma.uploadedFile.findUniqueOrThrow({
    where: { id: fileId },
  });

  await deleteFromS3(file.s3Key);

  if (file.ephemeralTable) {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${file.ephemeralTable}"`);
  }

  await prisma.uploadedFile.update({
    where: { id: fileId },
    data: { isDeleted: true },
  });
}
