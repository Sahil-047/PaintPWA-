import type { Request, Response, NextFunction } from 'express';
import { getTenantId } from '../../middlewares/tenant.middleware.js';
import { sendCreated, sendSuccess } from '../../utils/response.helper.js';
import * as cashmemoService from './cashmemo.service.js';
import { createCashMemoSchema } from './cashmemo.validator.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const input = createCashMemoSchema.parse(req.body);
    const memo = await cashmemoService.createCashMemo(tenantId, input);
    sendCreated(res, memo, 'Payment recorded');
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const memos = await cashmemoService.listCashMemos(getTenantId(req));
    sendSuccess(res, memos);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const memo = await cashmemoService.getCashMemo(getTenantId(req), String(req.params.id));
    sendSuccess(res, memo);
  } catch (err) {
    next(err);
  }
}

export async function downloadPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const memoId = String(req.params.id);
    const [buffer, memo] = await Promise.all([
      cashmemoService.getCashMemoPdf(tenantId, memoId),
      cashmemoService.getCashMemo(tenantId, memoId),
    ]);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${memo.memoNo}.html"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
