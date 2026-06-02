import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError.js';

export function superAdminMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'superadmin') {
    next(new AppError('Super admin access required', 403));
    return;
  }
  next();
}
