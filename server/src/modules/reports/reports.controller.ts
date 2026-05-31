import type { Request, Response, NextFunction } from 'express';
import { getTenantId } from '../../middlewares/tenant.middleware.js';
import { sendSuccess } from '../../utils/response.helper.js';
import * as reportsService from './reports.service.js';

export async function dashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reportsService.getLiveDashboard(getTenantId(req));
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function snapshots(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reportsService.listSnapshots(getTenantId(req));
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function snapshotByPeriod(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reportsService.getSnapshot(getTenantId(req), String(req.params.period));
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
