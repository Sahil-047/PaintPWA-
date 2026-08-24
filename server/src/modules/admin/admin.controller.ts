import type { Request, Response, NextFunction } from 'express';
import { sendPaginated, sendSuccess } from '../../utils/response.helper.js';
import * as adminService from './admin.service.js';
import { listTenantsQuerySchema, rejectTenantSchema } from './admin.validator.js';

export async function listTenants(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listTenantsQuerySchema.parse(req.query);
    const result = await adminService.listTenantRegistrations(query);
    sendPaginated(res, result.items, result.pagination);
  } catch (err) {
    next(err);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = await adminService.approveTenant(String(req.params.id));
    sendSuccess(res, tenant);
  } catch (err) {
    next(err);
  }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const body = rejectTenantSchema.parse(req.body);
    const tenant = await adminService.rejectTenant(String(req.params.id), body.reason);
    sendSuccess(res, tenant);
  } catch (err) {
    next(err);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = await adminService.deactivateTenant(String(req.params.id));
    sendSuccess(res, tenant);
  } catch (err) {
    next(err);
  }
}

export async function reactivate(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = await adminService.reactivateTenant(String(req.params.id));
    sendSuccess(res, tenant);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.deleteTenant(String(req.params.id));
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
