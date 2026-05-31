import mongoose, { Schema, Document, Types } from 'mongoose';
import { PAINT_SIZES, sumSizeMap } from './inventory.constants.js';

export interface IProduct extends Document {
  tenantId: Types.ObjectId;
  name: string;
  brand: Types.ObjectId;
  type: string;
  productCode: string;
  productImage: string;
  description: string;
  base: string;
  unit: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  stockBySize: Record<string, number>;
  priceBySize: Record<string, number>;
  isActive: boolean;
}

const sizeField = { type: Number, default: 0, min: 0 };

const productSchema = new Schema<IProduct>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    type: { type: String, required: true, trim: true },
    productCode: { type: String, required: true, trim: true },
    productImage: { type: String, default: '' },
    description: { type: String, default: '' },
    base: { type: String, default: '', trim: true },
    unit: { type: String, default: 'L', trim: true },
    price: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    stockBySize: {
      '50ml': sizeField,
      '100ml': sizeField,
      '200ml': sizeField,
      '500ml': sizeField,
      '1L': sizeField,
      '4L': sizeField,
      '10L': sizeField,
      '20L': sizeField,
    },
    priceBySize: {
      '50ml': sizeField,
      '100ml': sizeField,
      '200ml': sizeField,
      '500ml': sizeField,
      '1L': sizeField,
      '4L': sizeField,
      '10L': sizeField,
      '20L': sizeField,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.pre('save', function syncStock() {
  if (this.stockBySize) {
    this.stock = sumSizeMap(this.stockBySize);
  }
});

productSchema.index({ tenantId: 1, brand: 1, type: 1 });
productSchema.index({ tenantId: 1, name: 'text', productCode: 'text' });
productSchema.index({ tenantId: 1, brand: 1, productCode: 1, base: 1 }, { unique: true });

export const ProductModel = mongoose.model<IProduct>('Product', productSchema);
export { PAINT_SIZES };
