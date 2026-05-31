import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface ITenant extends Document {
  name: string;
  slug: string;
  plan: 'free' | 'pro';
}

const tenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },
  },
  { timestamps: true }
);

export const TenantModel = mongoose.model<ITenant>('Tenant', tenantSchema);

export interface IUser extends Document {
  tenantId: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'staff';
  comparePassword(entered: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'staff'], default: 'admin' },
  },
  { timestamps: true }
);

userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

userSchema.methods.comparePassword = async function (entered: string): Promise<boolean> {
  return bcrypt.compare(entered, this.passwordHash);
};

export const UserModel = mongoose.model<IUser>('User', userSchema);
