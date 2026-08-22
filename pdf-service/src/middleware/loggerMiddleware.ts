import { Request, Response, NextFunction } from 'express';
import logger from '../lib/winston/logger';

export function loggerMiddleware(req: Request, _res: Response, next: NextFunction) {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
}
