import type { Request, Response, NextFunction } from 'express';
import { getTenantId } from '../../middlewares/tenant.middleware.js';
import { sendCreated, sendPaginated, sendSuccess } from '../../utils/response.helper.js';
import * as billingService from './billing.service.js';
import { billingProductsQuerySchema, createBillSchema, recordBillPaymentSchema } from './billing.validator.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const input = createBillSchema.parse(req.body);
    const result = await billingService.createBill(tenantId, input);

    res.status(201).json({
      success: true,
      message: 'Bill created successfully',
      data: {
        bill: result.bill,
        cashMemo: result.cashMemo,
        creditApplied: result.creditApplied,
      },
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

export async function recordPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const input = recordBillPaymentSchema.parse(req.body);
    const bill = await billingService.recordBillPayment(tenantId, String(req.params.id), input);
    res.status(200).json({ success: true, message: 'Payment recorded', data: bill });
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

export async function downloadPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const billId = String(req.params.id);
    const formatRaw = String(req.query.format ?? 'standard').toLowerCase();
    const format = formatRaw === 'dl' ? 'dl' : 'standard';
    const [buffer, bill] = await Promise.all([
      billingService.getBillPdf(tenantId, billId, format),
      billingService.getBill(tenantId, billId),
    ]);
    const suffix = format === 'dl' ? '-dl' : '';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${bill.billNo}${suffix}.pdf"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
