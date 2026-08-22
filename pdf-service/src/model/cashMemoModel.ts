import mongoose, { Schema, Document, Types } from 'mongoose';

/** Minimal CashMemo schema — shares MongoDB collection with main PaintPWA API. */
export interface ICashMemo extends Document {
  tenantId: Types.ObjectId;
  memoNo: string;
  pdfUrl?: string;
}

const cashMemoSchema = new Schema<ICashMemo>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    memoNo: { type: String, required: true },
    pdfUrl: { type: String },
  },
  { timestamps: true, strict: false }
);

export default mongoose.model<ICashMemo>('CashMemo', cashMemoSchema);
