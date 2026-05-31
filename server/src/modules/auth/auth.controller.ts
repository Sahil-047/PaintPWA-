import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AppError } from '../../utils/appError.js';
import { sendSuccess } from '../../utils/response.helper.js';
import * as authService from './auth.service.js';
import { loginSchema, registerSchema } from './auth.validator.js';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.registerTenant(input);
    res.status(201).json({ success: true, data: result });
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
