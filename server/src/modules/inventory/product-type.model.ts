import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProductType extends Document {
  tenantId: Types.ObjectId;
  brandId: Types.ObjectId;
  name: string;
  icon: string;
  isActive: boolean;
}

const productTypeSchema = new Schema<IProductType>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productTypeSchema.index({ tenantId: 1, brandId: 1, name: 1 }, { unique: true });

export const ProductTypeModel = mongoose.model<IProductType>('ProductType', productTypeSchema);
