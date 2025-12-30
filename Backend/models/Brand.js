import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a brand name'],
      unique: true,
      trim: true,
    },
    image: {
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

const Brand = mongoose.model('Brand', brandSchema);

export default Brand;

