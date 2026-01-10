import mongoose from 'mongoose';

const productTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a product type name'],
      trim: true,
      unique: true,
    },
    icon: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique type name globally
productTypeSchema.index({ name: 1 }, { unique: true });

const ProductType = mongoose.model('ProductType', productTypeSchema);

export default ProductType;

