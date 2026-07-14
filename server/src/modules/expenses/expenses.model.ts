import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExpense extends Document {
  tenantId: Types.ObjectId;
  category: string;
  description: string;
  amount: number;
  date: Date;
  addedBy: Types.ObjectId;
  painterId?: Types.ObjectId | null;
}

const expenseSchema = new Schema<IExpense>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    painterId: { type: Schema.Types.ObjectId, ref: 'Painter', default: null, index: true },
  },
  { timestamps: true }
);

expenseSchema.index({ tenantId: 1, date: -1 });
expenseSchema.index({ tenantId: 1, painterId: 1, date: -1 });

export const ExpenseModel = mongoose.model<IExpense>('Expense', expenseSchema);
