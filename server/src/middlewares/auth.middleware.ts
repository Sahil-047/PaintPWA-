import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { UserModel } from '../modules/auth/auth.model.js';
import { AppError } from '../utils/appError.js';

interface JwtPayload {
  id: string;
  tenantId: string;
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new AppError('Not authorized, no token', 401));
    return;
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await UserModel.findById(decoded.id).select('-passwordHash');
    if (!user) {
      next(new AppError('User not found', 401));
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
    next(new AppError('Not authorized, token failed', 401));
  }
}
