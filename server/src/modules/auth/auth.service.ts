import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';
import { TenantModel, UserModel } from './auth.model.js';
import type { LoginInput, RegisterInput } from './auth.validator.js';

function signToken(userId: Types.ObjectId, tenantId: Types.ObjectId): string {
  return jwt.sign(
    { id: userId.toString(), tenantId: tenantId.toString() },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRE as jwt.SignOptions['expiresIn'] }
  );
}

export async function registerTenant(input: RegisterInput) {
  const existing = await TenantModel.findOne({ slug: input.slug });
  if (existing) {
    throw new AppError('Shop slug already taken', 409);
  }

  const tenant = await TenantModel.create({
    name: input.shopName,
    slug: input.slug,
    plan: 'free',
  });

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await UserModel.create({
    tenantId: tenant._id,
    name: input.name,
    email: input.email,
    passwordHash,
    role: 'admin',
  });

  const token = signToken(user._id as Types.ObjectId, tenant._id as Types.ObjectId);

  return {
    token,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    tenant: { _id: tenant._id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
  };
}

export async function loginUser(input: LoginInput) {
  const user = await UserModel.findOne({ email: input.email }).select('+passwordHash');
  if (!user || !(await user.comparePassword(input.password))) {
    throw new AppError('Invalid email or password', 401);
  }

  const tenant = await TenantModel.findById(user.tenantId);
  if (!tenant) {
    throw new AppError('Tenant not found', 404);
  }

  const token = signToken(user._id as Types.ObjectId, tenant._id as Types.ObjectId);

  return {
    token,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    tenant: { _id: tenant._id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
  };
}

export async function getMe(userId: Types.ObjectId) {
  const user = await UserModel.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  const tenant = await TenantModel.findById(user.tenantId);
  if (!tenant) throw new AppError('Tenant not found', 404);

  return {
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    tenant: { _id: tenant._id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
  };
}
