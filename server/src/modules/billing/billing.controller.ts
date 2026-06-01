import type { Request, Response, NextFunction } from 'express';
import { getTenantId } from '../../middlewares/tenant.middleware.js';
import { sendCreated, sendPaginated, sendSuccess } from '../../utils/response.helper.js';
import * as billingService from './billing.service.js';
import { billingProductsQuerySchema, createBillSchema } from './billing.validator.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const input = createBillSchema.parse(req.body);
    const result = await billingService.createBill(tenantId, input);

    res.status(201).json({
      success: true,
      message: 'Bill created successfully',
      data: { bill: result.bill, cashMemo: result.cashMemo },
    });

    // PDF available via separate download endpoint in future
    void result.pdfBuffer;
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const bills = await billingService.listBills(getTenantId(req));
    sendSuccess(res, bills);
  } catch (err) {
    next(err);
  }
}

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const query = billingProductsQuerySchema.parse(req.query);
    const result = await billingService.listBillingProducts(getTenantId(req), query);
    sendPaginated(res, result.items, result.pagination);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const bill = await billingService.getBill(getTenantId(req), String(req.params.id));
    sendSuccess(res, bill);
  } catch (err) {
    next(err);
  }
}
