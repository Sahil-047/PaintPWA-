import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { SESSION_COOKIE } from '../config/session.js';
import { UserModel } from '../modules/auth/auth.model.js';
import type { JwtPayload } from '../modules/auth/auth.service.js';
import { AppError } from '../utils/appError.js';

function readSessionToken(req: Request): string | null {
  const fromCookie = req.cookies?.[SESSION_COOKIE];
  if (typeof fromCookie === 'string' && fromCookie.length > 0) {
    return fromCookie;
  }
  return null;
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = readSessionToken(req);
  if (!token) {
    next(new AppError('Not authorized, no session', 401));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await UserModel.findById(decoded.id).select('-passwordHash');
    if (!user) {
      next(new AppError('User not found', 401));
      return;
    }

    const tokenVersion = user.tokenVersion ?? 0;
    if (decoded.tv !== tokenVersion) {
      next(new AppError('Session expired. Please sign in again.', 401));
      return;
    }

    if (decoded.isSuperAdmin || user.role === 'superadmin') {
      if (user.role !== 'superadmin') {
        next(new AppError('Not authorized', 401));
        return;
      }
      req.user = {
        _id: user._id as Types.ObjectId,
        name: user.name,
        email: user.email,
        role: 'superadmin',
      };
      next();
      return;
    }

    if (!user.tenantId) {
      next(new AppError('Tenant context missing', 403));
      return;
    }

    req.user = {
      _id: user._id as Types.ObjectId,
      tenantId: user.tenantId as Types.ObjectId,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch {
    next(new AppError('Not authorized, session invalid', 401));
  }
}
