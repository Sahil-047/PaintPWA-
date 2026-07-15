import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBillItem {
  productId: Types.ObjectId;
  productName: string;
  qty: number;
  rate: number;
  total: number;
}

export interface IBill extends Document {
  tenantId: Types.ObjectId;
  billNo: string;
  customerId: Types.ObjectId;
  items: IBillItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  pdfUrl?: string;
  status: 'paid' | 'partial' | 'due';
}

const billItemSchema = new Schema<IBillItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const billSchema = new Schema<IBill>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    billNo: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: [billItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    pdfUrl: { type: String },
    status: { type: String, enum: ['paid', 'partial', 'due'], default: 'due' },
  },
  { timestamps: true }
);

billSchema.index({ tenantId: 1, billNo: 1 }, { unique: true });
billSchema.index({ tenantId: 1, createdAt: -1 });
billSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });

export const BillModel = mongoose.model<IBill>('Bill', billSchema);
