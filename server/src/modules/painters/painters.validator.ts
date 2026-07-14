import { z } from 'zod';

export const createPainterSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export const updatePainterSchema = createPainterSchema.partial();

export const recordPainterPaymentSchema = z.object({
  amount: z.number().positive(),
  description: z.string().optional(),
  date: z.coerce.date().optional(),
});

export type CreatePainterInput = z.infer<typeof createPainterSchema>;
export type UpdatePainterInput = z.infer<typeof updatePainterSchema>;
export type RecordPainterPaymentInput = z.infer<typeof recordPainterPaymentSchema>;
