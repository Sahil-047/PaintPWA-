import { z } from 'zod';

export const createBillSchema = z.object({
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    address: z.string().optional(),
    gstin: z.string().optional(),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().min(1),
        rate: z.number().positive(),
        size: z.string().optional(),
      })
    )
    .min(1),
  discount: z.number().min(0).optional(),
  amountPaid: z.number().min(0).optional(),
  paymentMode: z.string().optional(),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;

export const billingProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  brandId: z.string().optional(),
  type: z.string().optional(),
});

export type BillingProductsQuery = z.infer<typeof billingProductsQuerySchema>;

export const recordBillPaymentSchema = z.object({
  amountPaid: z.number().min(0.01),
  paymentMode: z.string().optional(),
});

export type RecordBillPaymentInput = z.infer<typeof recordBillPaymentSchema>;
