import { promises as fs } from 'node:fs';
import path from 'node:path';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';
import { s3Client } from '../lib/aws/s3Client.js';

const PDF_ROOT_DIR = path.resolve(process.cwd(), 'storage', 'pdfs');

function sanitizeSegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9-_./]/g, '_');
}

export function buildPdfKey(
  tenantId: string,
  kind: 'bill' | 'cashmemo',
  reference: string
): string {
  const safeTenant = sanitizeSegment(tenantId);
  const safeRef = sanitizeSegment(reference);
  return `${safeTenant}/${kind}/${safeRef}.pdf`;
}

function keyToAbsolutePath(key: string): string {
  return path.join(PDF_ROOT_DIR, sanitizeSegment(key));
}

async function savePdfLocal(key: string, buffer: Buffer): Promise<void> {
  const absolutePath = keyToAbsolutePath(key);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
}

async function readPdfLocal(key: string): Promise<Buffer | null> {
  try {
    const absolutePath = keyToAbsolutePath(key);
    return await fs.readFile(absolutePath);
  } catch {
    return null;
  }
}

async function savePdfS3(key: string, buffer: Buffer): Promise<void> {
  if (!env.AWS_S3_PDF_BUCKET) {
    throw new Error('AWS_S3_PDF_BUCKET is not configured');
  }
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_PDF_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    })
  );
}

async function readPdfS3(key: string): Promise<Buffer | null> {
  if (!env.AWS_S3_PDF_BUCKET) return null;
  try {
    const res = await s3Client.send(
      new GetObjectCommand({
        Bucket: env.AWS_S3_PDF_BUCKET,
        Key: key,
      })
    );
    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch {
    return null;
  }
}

export async function savePdfByKey(key: string, buffer: Buffer): Promise<void> {
  if (env.PDF_STORAGE === 's3') {
    await savePdfS3(key, buffer);
    return;
  }
  await savePdfLocal(key, buffer);
}

export async function readPdfByKey(key: string): Promise<Buffer | null> {
  if (env.PDF_STORAGE === 's3') {
    return readPdfS3(key);
  }
  return readPdfLocal(key);
}
