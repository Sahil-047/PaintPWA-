import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPainter extends Document {
  tenantId: Types.ObjectId;
  name: string;
  phone: string;
  notes?: string;
}

const painterSchema = new Schema<IPainter>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

painterSchema.index({ tenantId: 1, name: 1 });

export const PainterModel = mongoose.model<IPainter>('Painter', painterSchema);
