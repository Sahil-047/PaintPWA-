import type { NextFunction, Request, Response } from 'express';
import { getTenantId } from '../../middlewares/tenant.middleware.js';
import { sendCreated, sendSuccess } from '../../utils/response.helper.js';
import * as returnsService from './returns.service.js';
import { createReturnSchema, listReturnsQuerySchema } from './returns.validator.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const input = createReturnSchema.parse(req.body);
    const item = await returnsService.createReturn(tenantId, input);
    sendCreated(res, item, 'Return recorded');
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const query = listReturnsQuerySchema.parse(req.query);
    const items = await returnsService.listReturns(tenantId, query);
    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
}

