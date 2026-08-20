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
        qty: z
          .number({ invalid_type_error: 'Quantity must be a number' })
          .int('Quantity must be a whole number')
          .min(1, 'Quantity must be at least 1'),
        rate: z.number().positive(),
        size: z.string().optional(),
        colorCode: z.string().max(40).optional(),
      })
    )
    .min(1),
  discount: z.number().min(0).optional(),
  miscAmount: z.number().min(0).optional(),
  miscRemark: z.string().max(200).optional(),
  amountPaid: z.number().min(0).optional(),
  paymentMode: z.string().optional(),
}).superRefine((data, ctx) => {
  const misc = data.miscAmount ?? 0;
  if (misc > 0 && !data.miscRemark?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['miscRemark'],
      message: 'Remark is required when miscellaneous amount is added',
    });
  }
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
