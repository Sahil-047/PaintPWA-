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
        rate: z.number().min(0).optional(),
      })
    )
    .min(1),
  discount: z.number().min(0).optional(),
  amountPaid: z.number().min(0).optional(),
  paymentMode: z.string().optional(),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
