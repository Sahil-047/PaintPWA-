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
}

function signTenantToken(userId: Types.ObjectId, tenantId: Types.ObjectId): string {
  return jwt.sign(
    { id: userId.toString(), tenantId: tenantId.toString() },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRE as jwt.SignOptions['expiresIn'] }
  );
}

function signSuperAdminToken(userId: Types.ObjectId): string {
  return jwt.sign(
    { id: userId.toString(), isSuperAdmin: true },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRE as jwt.SignOptions['expiresIn'] }
  );
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
    const token = signSuperAdminToken(user._id as Types.ObjectId);
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

  const token = signTenantToken(user._id as Types.ObjectId, tenant._id as Types.ObjectId);

  return {
    token,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    tenant: serializeTenant(tenant),
    isSuperAdmin: false as const,
  };
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
  await user.save();
  return { ok: true as const };
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
