import { z } from 'zod';

export const listTenantsQuerySchema = z.object({
  status: z
    .enum(['pending', 'approved', 'rejected', 'deactivated', 'all'])
    .optional()
    .default('pending'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const rejectTenantSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>;
