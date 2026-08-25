import { timingSafeEqual } from 'crypto';
import type { RequestHandler } from 'express';

const HEADER = 'x-pdf-service-key';

function safeCompare(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const serviceAuthMiddleware: RequestHandler = (req, res, next) => {
  const secret = process.env.PDF_SERVICE_SECRET?.trim();
  if (!secret) {
    res.status(503).json({ success: false, error: 'PDF service authentication is not configured' });
    return;
  }

  const provided = req.get(HEADER)?.trim() ?? '';
  if (!provided || !safeCompare(provided, secret)) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  next();
};
