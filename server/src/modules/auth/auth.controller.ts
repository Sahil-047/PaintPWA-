import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AppError } from '../../utils/appError.js';
import { sendSuccess } from '../../utils/response.helper.js';
import * as authService from './auth.service.js';
import { createSuperAdmin } from '../admin/admin.service.js';
import { createSuperAdminSchema, loginSchema, registerSchema, updatePasswordSchema, updateProfileSchema, updateShopSchema } from './auth.validator.js';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.registerTenant(input);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function bootstrapSuperAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createSuperAdminSchema.parse(req.body);
    const user = await createSuperAdmin(input);
    res.status(201).json({
      success: true,
      message: 'Super admin created. Sign in with POST /api/auth/login',
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.loginUser(input);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?._id) throw new AppError('Unauthorized', 401);
    const result = await authService.getMe(req.user._id as Types.ObjectId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?._id) throw new AppError('Unauthorized', 401);
    const input = updateProfileSchema.parse(req.body);
    const user = await authService.updateProfile(req.user._id as Types.ObjectId, input);
    sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
}

export async function updatePassword(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?._id) throw new AppError('Unauthorized', 401);
    const input = updatePasswordSchema.parse(req.body);
    const result = await authService.updatePassword(req.user._id as Types.ObjectId, input);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function updateShop(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?._id) throw new AppError('Unauthorized', 401);
    if (!req.user.tenantId) throw new AppError('Tenant context missing', 403);
    const input = updateShopSchema.parse(req.body);
    const tenant = await authService.updateShop(
      req.user.tenantId as Types.ObjectId,
      req.user.role,
      input
    );
    sendSuccess(res, { tenant });
  } catch (err) {
    next(err);
  }
}
