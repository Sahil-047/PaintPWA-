import type { Request, Response, NextFunction } from 'express';
import { getTenantId } from '../../middlewares/tenant.middleware.js';
import { AppError } from '../../utils/appError.js';
import { sendCreated, sendSuccess } from '../../utils/response.helper.js';
import * as expensesService from './expenses.service.js';
import { createExpenseSchema } from './expenses.validator.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const expenses = await expensesService.listExpenses(getTenantId(req));
    sendSuccess(res, expenses);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?._id) throw new AppError('Unauthorized', 401);
    const input = createExpenseSchema.parse(req.body);
    const expense = await expensesService.createExpense(
      getTenantId(req),
      req.user._id,
      input
    );
    sendCreated(res, expense, 'Expense recorded');
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await expensesService.deleteExpense(getTenantId(req), String(req.params.id));
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}
