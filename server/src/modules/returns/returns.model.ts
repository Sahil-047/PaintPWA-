import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReturnItem extends Document {
  tenantId: Types.ObjectId;
  customerId: Types.ObjectId;
  billId: Types.ObjectId;
  productId: Types.ObjectId;
  productName: string;
  qty: number;
  rate: number;
  amount: number;
  creditIssued: number;
  reason?: string;
}

const returnItemSchema = new Schema<IReturnItem>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    billId: { type: Schema.Types.ObjectId, ref: 'Bill', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    qty: { type: Number, required: true, min: 0.0001 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    creditIssued: { type: Number, default: 0, min: 0 },
    reason: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

returnItemSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });

export const ReturnItemModel = mongoose.model<IReturnItem>('ReturnItem', returnItemSchema);

