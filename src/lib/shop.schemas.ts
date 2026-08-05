import { z } from "zod";

export const dateSchema = z.object({ date: z.string().date() });
export const monthSchema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) });
export const idSchema = z.object({ id: z.string().uuid() });

export const menuInputSchema = z.object({
  date: z.string().date(),
  name: z.string().trim().min(1).max(60),
  price: z.coerce.number().int().min(0).max(1000000),
});

export const menuUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  price: z.coerce.number().int().min(0).max(1000000),
});

export const copySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});

export const analyticsSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2999).nullable().optional(),
});

export const saleUpdateSchema = z.object({
  id: z.string().uuid(),
  soldAt: z.string().min(1),
  note: z.string().trim().max(200).nullable().optional(),
  items: z
    .array(
      z.object({
        id: z.string().uuid().nullable().optional(),
        name: z.string().trim().min(1).max(60),
        unitPrice: z.coerce.number().int().min(0),
        quantity: z.coerce.number().int().min(1).max(999),
      }),
    )
    .min(1),
});

export const saleInputSchema = z.object({
  date: z.string().date(),
  soldAt: z.string().min(1),
  note: z.string().trim().max(200).nullable().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid().nullable(),
        name: z.string().trim().min(1).max(60),
        unitPrice: z.coerce.number().int().min(0),
        quantity: z.coerce.number().int().min(1).max(999),
      }),
    )
    .min(1),
});