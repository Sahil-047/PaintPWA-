import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';
import { TenantModel, UserModel } from '../auth/auth.model.js';
import type { ListTenantsQuery } from './admin.validator.js';

export interface TenantRegistrationRow {
  _id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  rejectionReason?: string;
  createdAt: string;
  owner?: {
    _id: string;
    name: string;
    email: string;
  };
}

export async function migrateLegacyTenants(): Promise<void> {
  const result = await TenantModel.updateMany(
    { $or: [{ status: { $exists: false } }, { status: null }] },
    { $set: { status: 'approved' } }
  );
  if (result.modifiedCount > 0) {
    console.log(`Migrated ${result.modifiedCount} tenant(s) to approved status`);
  }
}

export async function createSuperAdmin(input: {
  email: string;
  password: string;
  name: string;
  setupSecret: string;
}) {
  if (!env.BOOTSTRAP_SECRET) {
    throw new AppError('Super admin bootstrap is not configured on this server', 503);
  }

  const existingSuperAdmin = await UserModel.exists({ role: 'superadmin' });
  if (existingSuperAdmin) {
    throw new AppError('Super admin bootstrap is disabled after initial setup', 403);
  }

  if (input.setupSecret !== env.BOOTSTRAP_SECRET) {
    throw new AppError('Invalid setup secret', 403);
  }

  const email = input.email.toLowerCase();
  const existing = await UserModel.findOne({ email });
  if (existing) {
    if (existing.role === 'superadmin') {
      throw new AppError('Super admin with this email already exists', 409);
    }
    throw new AppError('Email is already registered', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await UserModel.create({
    name: input.name,
    email,
    passwordHash,
    role: 'superadmin',
  });

  return {
    _id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function ensureSuperAdmin(): Promise<void> {
  if (!env.SUPERADMIN_EMAIL || !env.SUPERADMIN_PASSWORD) {
    return;
  }

  const email = env.SUPERADMIN_EMAIL.toLowerCase();
  const existing = await UserModel.findOne({ email, role: 'superadmin' });
  if (existing) return;

  const passwordHash = await bcrypt.hash(env.SUPERADMIN_PASSWORD, 10);
  await UserModel.create({
    name: 'Super Admin',
    email,
    passwordHash,
    role: 'superadmin',
  });
  console.log(`Super admin account ready: ${email}`);
}

export async function listTenantRegistrations(query: ListTenantsQuery) {
  const filter: Record<string, unknown> = {};
  if (query.status !== 'all') {
    filter.status = query.status;
  }

  const skip = (query.page - 1) * query.limit;
  const [tenants, total] = await Promise.all([
    TenantModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
    TenantModel.countDocuments(filter),
  ]);

  const tenantIds = tenants.map((t) => t._id);
  const owners = await UserModel.find({
    tenantId: { $in: tenantIds },
    role: 'admin',
  })
    .select('tenantId name email')
    .lean();

  const ownerByTenant = new Map(
    owners.map((o) => [String(o.tenantId), { _id: String(o._id), name: o.name, email: o.email }])
  );

  const items: TenantRegistrationRow[] = tenants.map((t) => ({
    _id: String(t._id),
    name: t.name,
    slug: t.slug,
    plan: t.plan,
    status: t.status,
    rejectionReason: t.rejectionReason,
    createdAt: (t.createdAt as Date).toISOString(),
    owner: ownerByTenant.get(String(t._id)),
  }));

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit) || 1,
    },
  };
}

export async function approveTenant(tenantId: string) {
  const tenant = await TenantModel.findById(tenantId);
  if (!tenant) throw new AppError('Tenant not found', 404);
  if (tenant.status === 'approved') {
    throw new AppError('Tenant is already approved', 400);
  }

  tenant.status = 'approved';
  tenant.rejectionReason = undefined;
  await tenant.save();

  return serializeTenantRow(tenant._id as Types.ObjectId);
}

export async function rejectTenant(tenantId: string, reason?: string) {
  const tenant = await TenantModel.findById(tenantId);
  if (!tenant) throw new AppError('Tenant not found', 404);
  if (tenant.status === 'rejected') {
    throw new AppError('Tenant is already rejected', 400);
  }

  tenant.status = 'rejected';
  tenant.rejectionReason = reason?.trim() || undefined;
  await tenant.save();

  return serializeTenantRow(tenant._id as Types.ObjectId);
}

/** Suspend an approved shop — blocks login and API access. */
export async function deactivateTenant(tenantId: string) {
  const tenant = await TenantModel.findById(tenantId);
  if (!tenant) throw new AppError('Tenant not found', 404);
  if (tenant.status !== 'approved') {
    throw new AppError('Only approved shops can be deactivated', 400);
  }

  tenant.status = 'deactivated';
  await tenant.save();

  return serializeTenantRow(tenant._id as Types.ObjectId);
}

/** Restore a deactivated shop to approved. */
export async function reactivateTenant(tenantId: string) {
  const tenant = await TenantModel.findById(tenantId);
  if (!tenant) throw new AppError('Tenant not found', 404);
  if (tenant.status !== 'deactivated') {
    throw new AppError('Only deactivated shops can be reactivated', 400);
  }

  tenant.status = 'approved';
  tenant.rejectionReason = undefined;
  await tenant.save();

  return serializeTenantRow(tenant._id as Types.ObjectId);
}

/**
 * Permanently remove the tenant workspace and its users.
 * Operational data (bills, inventory) keyed by tenantId is left orphaned.
 */
export async function deleteTenant(tenantId: string) {
  const tenant = await TenantModel.findById(tenantId);
  if (!tenant) throw new AppError('Tenant not found', 404);

  const id = tenant._id as Types.ObjectId;
  await UserModel.deleteMany({ tenantId: id });
  await TenantModel.deleteOne({ _id: id });

  return { deleted: true as const, id: String(id), slug: tenant.slug, name: tenant.name };
}

async function serializeTenantRow(tenantId: Types.ObjectId): Promise<TenantRegistrationRow> {
  const tenant = await TenantModel.findById(tenantId).lean();
  if (!tenant) throw new AppError('Tenant not found', 404);

  const owner = await UserModel.findOne({ tenantId, role: 'admin' })
    .select('name email')
    .lean();

  return {
    _id: String(tenant._id),
    name: tenant.name,
    slug: tenant.slug,
    plan: tenant.plan,
    status: tenant.status,
    rejectionReason: tenant.rejectionReason,
    createdAt: (tenant.createdAt as Date).toISOString(),
    owner: owner
      ? { _id: String(owner._id), name: owner.name, email: owner.email }
      : undefined,
  };
}
