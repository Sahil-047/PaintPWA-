import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTenantId } from '../../middlewares/tenant.middleware.js';
import { sendSuccess } from '../../utils/response.helper.js';
import * as reportsService from './reports.service.js';
import { getStoreDashboardOverview } from './dashboard-overview.service.js';

const overviewPeriodSchema = z
  .enum(['this-month', 'last-month', 'this-week'])
  .default('this-month');

export async function dashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reportsService.getLiveDashboard(getTenantId(req));
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

/** Single home-dashboard payload (metrics, charts, status cards). */
export async function overview(req: Request, res: Response, next: NextFunction) {
  try {
    const period = overviewPeriodSchema.parse(req.query.period ?? 'this-month');
    const data = await getStoreDashboardOverview(getTenantId(req), period);
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
