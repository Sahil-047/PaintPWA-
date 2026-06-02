import type { Request } from 'express';
import type { Types } from 'mongoose';
import type { UserRole } from '../modules/auth/auth.model.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: Types.ObjectId;
        tenantId?: Types.ObjectId;
        name: string;
        email: string;
        role: UserRole;
      };
      tenant?: {
        id: Types.ObjectId;
        slug: string;
        name: string;
      };
    }
  }
}

export {};
