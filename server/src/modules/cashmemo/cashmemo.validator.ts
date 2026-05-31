import { z } from 'zod';

export const createCashMemoSchema = z.object({
  billId: z.string().min(1),
  customerId: z.string().min(1),
  amountPaid: z.number().min(0.01),
  paymentMode: z.string().optional(),
});

export type CreateCashMemoInput = z.infer<typeof createCashMemoSchema>;
