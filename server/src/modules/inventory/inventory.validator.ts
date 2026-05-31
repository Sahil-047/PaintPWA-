import { z } from 'zod';
import { PAINT_SIZES } from './inventory.constants.js';

const sizeMapSchema = z
  .object(
    Object.fromEntries(PAINT_SIZES.map((s) => [s, z.number().min(0).optional()])) as Record<
      string,
      z.ZodOptional<z.ZodNumber>
    >
  )
  .optional();

export const createBrandSchema = z.object({
  name: z.string().min(1),
  image: z.string().optional(),
});

export const updateBrandSchema = createBrandSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createProductTypeSchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
});

export const updateProductTypeSchema = createProductTypeSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(1),
  brand: z.string().min(1),
  type: z.string().min(1),
  productCode: z.string().min(1),
  productImage: z.string().optional(),
  description: z.string().optional(),
  base: z.string().optional(),
  unit: z.string().optional(),
  price: z.number().min(0).optional(),
  lowStockThreshold: z.number().min(0).optional(),
  stockBySize: sizeMapSchema,
  priceBySize: sizeMapSchema,
  isActive: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const updateStockSchema = z.object({
  size: z.enum(PAINT_SIZES as unknown as [string, ...string[]]).optional(),
  qty: z.number(),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type CreateProductTypeInput = z.infer<typeof createProductTypeSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
