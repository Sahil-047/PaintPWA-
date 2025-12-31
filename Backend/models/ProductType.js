import mongoose from 'mongoose';

const productTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a product type name'],
      trim: true,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: [true, 'Please provide a brand'],
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

// Ensure unique type per brand
productTypeSchema.index({ name: 1, brand: 1 }, { unique: true });

const ProductType = mongoose.model('ProductType', productTypeSchema);

export default ProductType;

