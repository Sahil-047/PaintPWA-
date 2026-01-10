import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: [true, 'Please provide a brand'],
    },
    price: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
    },
    stock: {
      type: Number,
      required: [true, 'Please provide stock quantity'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    unit: {
      type: String,
      required: [true, 'Please provide a unit'],
      default: 'L',
    },
    productCode: {
      type: String,
      trim: true,
      default: '',
    },
    productImage: {
      type: String,
      default: '',
    },
    lowStockThreshold: {
      type: Number,
      min: [0, 'Low stock threshold cannot be negative'],
      default: 5,
    },
    stockBySize: {
      '1L': {
        type: Number,
        default: 0,
        min: 0,
      },
      '4L': {
        type: Number,
        default: 0,
        min: 0,
      },
      '10L': {
        type: Number,
        default: 0,
        min: 0,
      },
      '20L': {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    priceBySize: {
      '1L': {
        type: Number,
        default: 0,
        min: 0,
      },
      '4L': {
        type: Number,
        default: 0,
        min: 0,
      },
      '10L': {
        type: Number,
        default: 0,
        min: 0,
      },
      '20L': {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    type: {
      type: String,
      required: [true, 'Please provide a product type'],
      trim: true,
    },
    description: {
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

// Index for faster searches
productSchema.index({ name: 'text', brand: 'text' });
productSchema.index({ brand: 1 });
productSchema.index({ type: 1 });
productSchema.index({ brand: 1, type: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;

