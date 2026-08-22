import mongoose, { Schema, Document, Types } from 'mongoose';

/** Minimal Bill schema — shares MongoDB collection with main PaintPWA API. */
export interface IBill extends Document {
  tenantId: Types.ObjectId;
  billNo: string;
  pdfUrl?: string;
}

const billSchema = new Schema<IBill>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    billNo: { type: String, required: true },
    pdfUrl: { type: String },
  },
  { timestamps: true, strict: false }
);

export default mongoose.model<IBill>('Bill', billSchema);
