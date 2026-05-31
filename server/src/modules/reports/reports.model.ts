import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReportSnapshot extends Document {
  tenantId: Types.ObjectId;
  period: string;
  totalSales: number;
  totalCollected: number;
  totalDue: number;
  totalExpenses: number;
  topProducts: Array<{ productId: string; name: string; qty: number; revenue: number }>;
}

const reportSnapshotSchema = new Schema<IReportSnapshot>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    period: { type: String, required: true },
    totalSales: { type: Number, default: 0 },
    totalCollected: { type: Number, default: 0 },
    totalDue: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    topProducts: {
      type: [
        {
          productId: String,
          name: String,
          qty: Number,
          revenue: Number,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

reportSnapshotSchema.index({ tenantId: 1, period: 1 }, { unique: true });

export const ReportSnapshotModel = mongoose.model<IReportSnapshot>(
  'ReportSnapshot',
  reportSnapshotSchema
);
