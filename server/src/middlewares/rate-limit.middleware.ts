import rateLimit from 'express-rate-limit';

const jsonMessage = (message: string) => ({
  success: false,
  message,
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many login attempts. Please try again in 15 minutes.'),
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many registration attempts. Please try again later.'),
});

export const bootstrapLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many bootstrap attempts. Please try again later.'),
});
