import fs from 'fs';
import path from 'path';

const candidates = [
  path.join(__dirname, '../assets/paintapp-logo.png'),
  path.join(__dirname, '../../src/assets/paintapp-logo.png'),
  path.join(__dirname, '../../assets/paintapp-logo.png'),
];

let cached: string | null | undefined;

export function getPaintAppLogoDataUri(): string | null {
  if (cached !== undefined) return cached;
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        cached = `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
        return cached;
      }
    } catch {
      /* try next */
    }
  }
  cached = null;
  return null;
}
