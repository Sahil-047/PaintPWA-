import type { Request } from 'express';
import type { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: Types.ObjectId;
        tenantId: Types.ObjectId;
        name: string;
        email: string;
        role: 'admin' | 'staff';
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
