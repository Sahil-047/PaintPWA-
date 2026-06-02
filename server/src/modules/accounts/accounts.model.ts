import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAccount extends Document {
  tenantId: Types.ObjectId;
  customerId: Types.ObjectId;
  totalBilled: number;
  totalPaid: number;
  dueBalance: number;
  creditBalance: number;
  bills: Types.ObjectId[];
  memos: Types.ObjectId[];
  lastActivityAt: Date;
}

const accountSchema = new Schema<IAccount>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    totalBilled: { type: Number, default: 0, min: 0 },
    totalPaid: { type: Number, default: 0, min: 0 },
    dueBalance: { type: Number, default: 0, min: 0 },
    creditBalance: { type: Number, default: 0, min: 0 },
    bills: [{ type: Schema.Types.ObjectId, ref: 'Bill' }],
    memos: [{ type: Schema.Types.ObjectId, ref: 'CashMemo' }],
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

accountSchema.index({ tenantId: 1, customerId: 1 }, { unique: true });

export const AccountModel = mongoose.model<IAccount>('Account', accountSchema);
