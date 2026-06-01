import type { Request, Response, NextFunction } from 'express';
import { getTenantId } from '../../middlewares/tenant.middleware.js';
import { sendCreated, sendSuccess } from '../../utils/response.helper.js';
import * as accountsService from './accounts.service.js';
import { createCustomerSchema, updateCustomerSchema } from './accounts.validator.js';

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

export async function createCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCustomerSchema.parse(req.body);
    const customer = await accountsService.createCustomer(getTenantId(req), input);
    sendCreated(res, customer, 'Customer created');
  } catch (err) {
    next(err);
  }
}

export async function getCustomerDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const detail = await accountsService.getCustomerDetail(
      getTenantId(req),
      String(req.params.customerId)
    );
    sendSuccess(res, detail);
  } catch (err) {
    next(err);
  }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateCustomerSchema.parse(req.body);
    const customer = await accountsService.updateCustomer(
      getTenantId(req),
      String(req.params.customerId),
      input
    );
    sendSuccess(res, customer);
  } catch (err) {
    next(err);
  }
}
