import { Types } from 'mongoose';
import { AppError } from '../../utils/appError.js';
import { ExpenseModel } from '../expenses/expenses.model.js';
import * as expensesService from '../expenses/expenses.service.js';
import { PainterModel } from './painters.model.js';
import type {
  CreatePainterInput,
  RecordPainterPaymentInput,
  UpdatePainterInput,
} from './painters.validator.js';

type PainterListItem = {
  _id: string;
  tenantId: string;
  name: string;
  phone: string;
  notes?: string;
  createdAt: string;
  totalPaid: number;
};

export async function listPainters(tenantId: Types.ObjectId): Promise<PainterListItem[]> {
  const painters = await PainterModel.find({ tenantId }).sort({ createdAt: -1 }).lean();
  if (painters.length === 0) return [];

  const ids = painters.map((p) => p._id);
  const totals = await ExpenseModel.aggregate<{ _id: Types.ObjectId; totalPaid: number }>([
    { $match: { tenantId, painterId: { $in: ids } } },
    { $group: { _id: '$painterId', totalPaid: { $sum: '$amount' } } },
  ]);
  const totalByPainter = new Map(totals.map((t) => [String(t._id), t.totalPaid]));

  return painters.map((p) => {
    const rawCreated = (p as unknown as { createdAt?: Date | string }).createdAt;
    const createdAt =
      rawCreated instanceof Date
        ? rawCreated.toISOString()
        : typeof rawCreated === 'string'
          ? rawCreated
          : new Date().toISOString();
    return {
      _id: String(p._id),
      tenantId: String(p.tenantId),
      name: p.name,
      phone: p.phone ?? '',
      notes: p.notes ?? '',
      createdAt,
      totalPaid: totalByPainter.get(String(p._id)) ?? 0,
    };
  });
}

export async function createPainter(tenantId: Types.ObjectId, input: CreatePainterInput) {
  return PainterModel.create({
    tenantId,
    name: input.name,
    phone: input.phone ?? '',
    notes: input.notes ?? '',
  });
}

export async function getPainterDetail(tenantId: Types.ObjectId, painterId: string) {
  const painter = await PainterModel.findOne({ _id: painterId, tenantId });
  if (!painter) throw new AppError('Painter not found', 404);

  const payments = await ExpenseModel.find({ tenantId, painterId: painter._id })
    .populate('addedBy', 'name')
    .sort({ date: -1 });

  const totalPaid = payments.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  return { painter, payments, totalPaid };
}

export async function updatePainter(
  tenantId: Types.ObjectId,
  painterId: string,
  input: UpdatePainterInput
) {
  const painter = await PainterModel.findOneAndUpdate(
    { _id: painterId, tenantId },
    { $set: input },
    { new: true }
  );
  if (!painter) throw new AppError('Painter not found', 404);
  return painter;
}

export async function deletePainter(tenantId: Types.ObjectId, painterId: string) {
  const paymentCount = await ExpenseModel.countDocuments({
    tenantId,
    painterId: new Types.ObjectId(painterId),
  });
  if (paymentCount > 0) {
    throw new AppError('Cannot delete painter with recorded payments', 400);
  }

  const painter = await PainterModel.findOneAndDelete({ _id: painterId, tenantId });
  if (!painter) throw new AppError('Painter not found', 404);
  return painter;
}

export async function recordPayment(
  tenantId: Types.ObjectId,
  userId: Types.ObjectId,
  painterId: string,
  input: RecordPainterPaymentInput
) {
  const painter = await PainterModel.findOne({ _id: painterId, tenantId });
  if (!painter) throw new AppError('Painter not found', 404);

  const description =
    input.description?.trim() || `Payment to ${painter.name}`;

  return expensesService.createExpense(tenantId, userId, {
    category: 'Painter',
    description,
    amount: input.amount,
    date: input.date,
    painterId: String(painter._id),
  });
}
