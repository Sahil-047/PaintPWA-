import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AppError } from '../utils/appError.js';

export function tenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user?.tenantId) {
    next(new AppError('Tenant context missing', 403));
    return;
  }

  req.tenant = {
    id: req.user.tenantId as Types.ObjectId,
    slug: '',
    name: '',
  };

  next();
}

export function getTenantId(req: Request): Types.ObjectId {
  if (!req.user?.tenantId) {
    throw new AppError('Tenant context missing', 403);
  }
  return req.user.tenantId as Types.ObjectId;
}
