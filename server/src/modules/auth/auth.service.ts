import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';
import { TenantModel, UserModel } from './auth.model.js';
import type { LoginInput, RegisterInput, UpdatePasswordInput, UpdateProfileInput, UpdateShopInput } from './auth.validator.js';

interface JwtPayload {
  id: string;
  tenantId?: string;
  isSuperAdmin?: boolean;
  tv: number;
}

function signTenantToken(userId: Types.ObjectId, tenantId: Types.ObjectId, tokenVersion: number): string {
  return jwt.sign(
    { id: userId.toString(), tenantId: tenantId.toString(), tv: tokenVersion },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRE as jwt.SignOptions['expiresIn'] }
  );
}

function signSuperAdminToken(userId: Types.ObjectId, tokenVersion: number): string {
  return jwt.sign(
    { id: userId.toString(), isSuperAdmin: true, tv: tokenVersion },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRE as jwt.SignOptions['expiresIn'] }
  );
}

function issueToken(user: { _id: Types.ObjectId; role: string; tenantId?: Types.ObjectId; tokenVersion?: number }): string {
  const tv = user.tokenVersion ?? 0;
  if (user.role === 'superadmin') {
    return signSuperAdminToken(user._id, tv);
  }
  if (!user.tenantId) {
    throw new AppError('Tenant context missing', 403);
  }
  return signTenantToken(user._id, user.tenantId, tv);
}

async function revokeSessions(userId: Types.ObjectId): Promise<number> {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $inc: { tokenVersion: 1 } },
    { new: true }
  );
  if (!user) throw new AppError('User not found', 404);
  return user.tokenVersion ?? 0;
}

function serializeTenant(tenant: {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  plan: string;
  status: string;
  phone?: string;
  address?: string;
  gstin?: string;
}) {
  return {
    _id: tenant._id,
    name: tenant.name,
    slug: tenant.slug,
    plan: tenant.plan,
    status: tenant.status,
    phone: tenant.phone ?? '',
    address: tenant.address ?? '',
    gstin: tenant.gstin ?? '',
  };
}

export async function registerTenant(input: RegisterInput) {
  const existing = await TenantModel.findOne({ slug: input.slug });
  if (existing) {
    throw new AppError('Shop slug already taken', 409);
  }

  const emailTaken = await UserModel.findOne({ email: input.email.toLowerCase() });
  if (emailTaken) {
    throw new AppError('Email already registered', 409);
  }

  const tenant = await TenantModel.create({
    name: input.shopName,
    slug: input.slug,
    plan: 'free',
    status: 'pending',
  });

  const passwordHash = await bcrypt.hash(input.password, 10);
  await UserModel.create({
    tenantId: tenant._id,
    name: input.name,
    email: input.email,
    passwordHash,
    role: 'admin',
  });

  return {
    pending: true as const,
    message:
      'Registration submitted. You can sign in once a platform administrator approves your shop.',
    tenant: serializeTenant(tenant),
  };
}

export async function loginUser(input: LoginInput) {
  const user = await UserModel.findOne({ email: input.email }).select('+passwordHash');
  if (!user || !(await user.comparePassword(input.password))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.role === 'superadmin') {
    const token = issueToken(user);
    return {
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      isSuperAdmin: true as const,
    };
  }

  const tenant = await TenantModel.findById(user.tenantId);
  if (!tenant) {
    throw new AppError('Tenant not found', 404);
  }

  if (tenant.status === 'rejected') {
    throw new AppError(
      tenant.rejectionReason?.trim() || 'Your shop registration was not approved',
      403
    );
  }

  if (tenant.status === 'deactivated') {
    throw new AppError(
      'This shop subscription is deactivated. Contact support to restore access.',
      403
    );
  }

  const token = issueToken(user);

  return {
    token,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    tenant: serializeTenant(tenant),
    isSuperAdmin: false as const,
  };
}

export async function logoutUser(userId: Types.ObjectId) {
  await revokeSessions(userId);
}

export async function getMe(userId: Types.ObjectId) {
  const user = await UserModel.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  if (user.role === 'superadmin') {
    return {
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      isSuperAdmin: true as const,
    };
  }

  const tenant = await TenantModel.findById(user.tenantId);
  if (!tenant) throw new AppError('Tenant not found', 404);

  return {
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    tenant: serializeTenant(tenant),
    isSuperAdmin: false as const,
  };
}

export async function updateProfile(userId: Types.ObjectId, input: UpdateProfileInput) {
  const email = input.email.toLowerCase();
  const taken = await UserModel.findOne({
    email,
    _id: { $ne: userId },
  });
  if (taken) throw new AppError('Email already in use', 409);

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { name: input.name.trim(), email },
    { new: true, runValidators: true }
  );
  if (!user) throw new AppError('User not found', 404);

  return { _id: user._id, name: user.name, email: user.email, role: user.role };
}

export async function updatePassword(userId: Types.ObjectId, input: UpdatePasswordInput) {
  const user = await UserModel.findById(userId).select('+passwordHash');
  if (!user) throw new AppError('User not found', 404);

  if (!(await user.comparePassword(input.currentPassword))) {
    throw new AppError('Current password is incorrect', 400);
  }

  user.passwordHash = await bcrypt.hash(input.newPassword, 10);
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  const token = issueToken(user);
  return { ok: true as const, token };
}

export async function updateShop(
  tenantId: Types.ObjectId,
  role: string,
  input: UpdateShopInput
) {
  if (role !== 'admin') {
    throw new AppError('Only shop admins can edit shop details', 403);
  }

  const tenant = await TenantModel.findOneAndUpdate(
    { _id: tenantId },
    {
      name: input.name.trim(),
      phone: (input.phone ?? '').trim(),
      address: (input.address ?? '').trim(),
      gstin: (input.gstin ?? '').trim().toUpperCase(),
    },
    { new: true, runValidators: true }
  );
  if (!tenant) throw new AppError('Shop not found', 404);

  return serializeTenant(tenant);
}

export type { JwtPayload };
