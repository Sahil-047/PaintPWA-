import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICustomer extends Document {
  tenantId: Types.ObjectId;
  name: string;
  phone: string;
  address: string;
  gstin?: string;
}

const customerSchema = new Schema<ICustomer>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    gstin: { type: String, trim: true },
  },
  { timestamps: true }
);

customerSchema.index({ tenantId: 1, phone: 1 });

export const CustomerModel = mongoose.model<ICustomer>('Customer', customerSchema);
