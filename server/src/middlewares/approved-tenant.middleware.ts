import type { Request, Response, NextFunction } from 'express';
import { TenantModel } from '../modules/auth/auth.model.js';
import { AppError } from '../utils/appError.js';

export async function approvedTenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (req.user?.role === 'superadmin') {
    next();
    return;
  }

  if (!req.user?.tenantId) {
    next(new AppError('Tenant context missing', 403));
    return;
  }

  const tenant = await TenantModel.findById(req.user.tenantId).select('status rejectionReason');
  if (!tenant) {
    next(new AppError('Tenant not found', 404));
    return;
  }

  if (tenant.status === 'pending') {
    next(new AppError('Your shop registration is pending approval', 403));
    return;
  }

  if (tenant.status === 'rejected') {
    next(
      new AppError(
        tenant.rejectionReason?.trim() || 'Your shop registration was not approved',
        403
      )
    );
    return;
  }

  if (tenant.status === 'deactivated') {
    next(
      new AppError(
        'This shop subscription is deactivated. Contact support to restore access.',
        403
      )
    );
    return;
  }

  next();
}
