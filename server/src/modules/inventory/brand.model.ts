import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBrand extends Document {
  tenantId: Types.ObjectId;
  name: string;
  image: string;
  isActive: boolean;
}

const brandSchema = new Schema<IBrand>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

brandSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export const BrandModel = mongoose.model<IBrand>('Brand', brandSchema);
