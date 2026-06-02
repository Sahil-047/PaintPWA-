import { promises as fs } from 'node:fs';
import path from 'node:path';

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

export async function savePdfByKey(key: string, buffer: Buffer): Promise<void> {
  const absolutePath = keyToAbsolutePath(key);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
}

export async function readPdfByKey(key: string): Promise<Buffer | null> {
  try {
    const absolutePath = keyToAbsolutePath(key);
    return await fs.readFile(absolutePath);
  } catch {
    return null;
  }
}

