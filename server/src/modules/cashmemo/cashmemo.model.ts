import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICashMemo extends Document {
  tenantId: Types.ObjectId;
  memoNo: string;
  billId: Types.ObjectId;
  customerId: Types.ObjectId;
  amountPaid: number;
  paymentMode: string;
  paidAt: Date;
  pdfUrl?: string;
}

const cashMemoSchema = new Schema<ICashMemo>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    memoNo: { type: String, required: true },
    billId: { type: Schema.Types.ObjectId, ref: 'Bill', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    amountPaid: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, default: 'cash' },
    paidAt: { type: Date, default: Date.now },
    pdfUrl: { type: String },
  },
  { timestamps: true }
);

cashMemoSchema.index({ tenantId: 1, memoNo: 1 }, { unique: true });

export const CashMemoModel = mongoose.model<ICashMemo>('CashMemo', cashMemoSchema);
