import type { Request, Response, NextFunction } from 'express';
import { getTenantId } from '../../middlewares/tenant.middleware.js';
import { sendSuccess } from '../../utils/response.helper.js';
import * as accountsService from './accounts.service.js';

export async function listAccounts(req: Request, res: Response, next: NextFunction) {
  try {
    const accounts = await accountsService.listAccounts(getTenantId(req));
    sendSuccess(res, accounts);
  } catch (err) {
    next(err);
  }
}

export async function listCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const customers = await accountsService.listCustomers(getTenantId(req));
    sendSuccess(res, customers);
  } catch (err) {
    next(err);
  }
}
