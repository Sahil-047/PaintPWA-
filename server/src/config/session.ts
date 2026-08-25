import type { Response } from 'express';
import { env } from './env.js';

export const SESSION_COOKIE = 'paint_session';

const MS_PER_DAY = 86_400_000;

function cookieMaxAgeMs(): number {
  const match = /^(\d+)([dhms])?$/.exec(env.JWT_EXPIRE.trim());
  if (!match) return 7 * MS_PER_DAY;
  const n = Number(match[1]);
  switch (match[2] ?? 'd') {
    case 'd':
      return n * MS_PER_DAY;
    case 'h':
      return n * 3_600_000;
    case 'm':
      return n * 60_000;
    case 's':
      return n * 1000;
    default:
      return 7 * MS_PER_DAY;
  }
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api',
    maxAge: cookieMaxAgeMs(),
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api',
  });
}
