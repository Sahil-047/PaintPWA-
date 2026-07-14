import type { Request, Response, NextFunction } from 'express';
import { getTenantId } from '../../middlewares/tenant.middleware.js';
import { AppError } from '../../utils/appError.js';
import { sendCreated, sendSuccess } from '../../utils/response.helper.js';
import * as paintersService from './painters.service.js';
import {
  createPainterSchema,
  recordPainterPaymentSchema,
  updatePainterSchema,
} from './painters.validator.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const painters = await paintersService.listPainters(getTenantId(req));
    sendSuccess(res, painters);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createPainterSchema.parse(req.body);
    const painter = await paintersService.createPainter(getTenantId(req), input);
    sendCreated(res, painter, 'Painter added');
  } catch (err) {
    next(err);
  }
}

export async function getDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const detail = await paintersService.getPainterDetail(
      getTenantId(req),
      String(req.params.id)
    );
    sendSuccess(res, detail);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updatePainterSchema.parse(req.body);
    const painter = await paintersService.updatePainter(
      getTenantId(req),
      String(req.params.id),
      input
    );
    sendSuccess(res, painter);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await paintersService.deletePainter(getTenantId(req), String(req.params.id));
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function recordPayment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?._id) throw new AppError('Unauthorized', 401);
    const input = recordPainterPaymentSchema.parse(req.body);
    const expense = await paintersService.recordPayment(
      getTenantId(req),
      req.user._id,
      String(req.params.id),
      input
    );
    sendCreated(res, expense, 'Payment recorded');
  } catch (err) {
    next(err);
  }
}
