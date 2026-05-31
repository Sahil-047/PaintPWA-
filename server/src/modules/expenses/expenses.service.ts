import { Types } from 'mongoose';
import { AppError } from '../../utils/appError.js';
import { ExpenseModel } from './expenses.model.js';
import type { CreateExpenseInput } from './expenses.validator.js';

export async function listExpenses(tenantId: Types.ObjectId) {
  return ExpenseModel.find({ tenantId })
    .populate('addedBy', 'name')
    .sort({ date: -1 });
}

export async function createExpense(
  tenantId: Types.ObjectId,
  userId: Types.ObjectId,
  input: CreateExpenseInput
) {
  return ExpenseModel.create({
    tenantId,
    addedBy: userId,
    category: input.category,
    description: input.description ?? '',
    amount: input.amount,
    date: input.date ?? new Date(),
  });
}

export async function deleteExpense(tenantId: Types.ObjectId, expenseId: string) {
  const expense = await ExpenseModel.findOneAndDelete({ _id: expenseId, tenantId });
  if (!expense) throw new AppError('Expense not found', 404);
  return expense;
}

export async function getTotalExpenses(tenantId: Types.ObjectId, from: Date, to: Date) {
  const result = await ExpenseModel.aggregate([
    { $match: { tenantId, date: { $gte: from, $lte: to } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total ?? 0;
}
