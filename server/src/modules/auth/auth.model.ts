import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type TenantStatus = 'pending' | 'approved' | 'rejected' | 'deactivated';
export type UserRole = 'admin' | 'staff' | 'superadmin';

export interface ITenant extends Document {
  name: string;
  slug: string;
  plan: 'free' | 'pro';
  status: TenantStatus;
  rejectionReason?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'deactivated'],
      default: 'pending',
    },
    rejectionReason: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    gstin: { type: String, trim: true, uppercase: true },
  },
  { timestamps: true }
);

tenantSchema.index({ status: 1, createdAt: -1 });

export const TenantModel = mongoose.model<ITenant>('Tenant', tenantSchema);

export interface IUser extends Document {
  tenantId?: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  comparePassword(entered: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
      required: function (this: IUser) {
        return this.role !== 'superadmin';
      },
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'staff', 'superadmin'], default: 'admin' },
  },
  { timestamps: true }
);

userSchema.index({ tenantId: 1, email: 1 }, { unique: true, sparse: true });
userSchema.index({ email: 1, role: 1 });

userSchema.methods.comparePassword = async function (entered: string): Promise<boolean> {
  return bcrypt.compare(entered, this.passwordHash);
};

export const UserModel = mongoose.model<IUser>('User', userSchema);
