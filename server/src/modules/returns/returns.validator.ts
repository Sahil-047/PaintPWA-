import { z } from 'zod';

export const createReturnSchema = z.object({
  customerId: z.string().min(1),
  billId: z.string().min(1),
  productId: z.string().min(1),
  qty: z.number().positive(),
  reason: z.string().max(500).optional(),
});

export const listReturnsQuerySchema = z.object({
  customerId: z.string().optional(),
  billId: z.string().optional(),
});

export type CreateReturnInput = z.infer<typeof createReturnSchema>;
export type ListReturnsQuery = z.infer<typeof listReturnsQuerySchema>;

