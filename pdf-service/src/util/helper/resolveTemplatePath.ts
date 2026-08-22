import fs from 'fs/promises';
import path from 'path';

export async function resolveTemplatePath(filename: string): Promise<string> {
  const candidates = [
    path.join(process.cwd(), 'src', 'hbs', filename),
    path.join(process.cwd(), 'dist', 'hbs', filename),
    path.join(__dirname, '..', '..', 'hbs', filename),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }

  throw new Error(`HBS template not found: ${filename}`);
}
