import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  dateSchema,
  idSchema,
  menuInputSchema,
  menuUpdateSchema,
  monthSchema,
  copySchema,
  saleInputSchema,
  saleUpdateSchema,
  analyticsSchema,
  reorderSchema,
  dayNoteSchema,
  restoreSchema,
} from "@/lib/shop.schemas";

export const listMenus = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => dateSchema.parse(input))
  .handler(async ({ data }) => {
    const { getMenus } = await import("@/lib/shop.server");
    return getMenus(data.date);
  });

export const listPastMenus = createServerFn({ method: "GET" }).handler(async () => {
  const { getPastMenuNames } = await import("@/lib/shop.server");
  return getPastMenuNames();
});

export const addMenuItem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => menuInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { addMenu } = await import("@/lib/shop.server");
    return addMenu(data);
  });

export const updateMenuItem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => menuUpdateSchema.parse(input))
  .handler(async ({ data }) => {
    const { editMenu } = await import("@/lib/shop.server");
    return editMenu(data);
  });

export const deleteMenuItem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const { removeMenu } = await import("@/lib/shop.server");
    return removeMenu(data.id);
  });

export const copyMenuFromDate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => copySchema.parse(input))
  .handler(async ({ data }) => {
    const { copyMenus } = await import("@/lib/shop.server");
    return copyMenus(data);
  });

export const registerSale = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => saleInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { createSale } = await import("@/lib/shop.server");
    return createSale({
      date: data.date,
      soldAt: data.soldAt,
      note: data.note ?? null,
      discount: data.discount ?? null,
      items: data.items,
    });
  });

export const reorderMenuItems = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reorderSchema.parse(input))
  .handler(async ({ data }) => {
    const { reorderMenus } = await import("@/lib/shop.server");
    return reorderMenus(data.ids);
  });

export const fetchDayNote = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => dateSchema.parse(input))
  .handler(async ({ data }) => {
    const { getDayNote } = await import("@/lib/shop.server");
    return getDayNote(data.date);
  });

export const saveDayNoteFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => dayNoteSchema.parse(input))
  .handler(async ({ data }) => {
    const { saveDayNote } = await import("@/lib/shop.server");
    return saveDayNote(data.date, data.note);
  });

export const exportAllData = createServerFn({ method: "GET" }).handler(async () => {
  const { exportAll } = await import("@/lib/shop.server");
  return exportAll();
});

export const restoreAllData = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => restoreSchema.parse(input))
  .handler(async ({ data }) => {
    const { restoreAll } = await import("@/lib/shop.server");
    return restoreAll(data.payload);
  });

export const deleteSale = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const { removeSale } = await import("@/lib/shop.server");
    return removeSale(data.id);
  });

export const updateSaleRecord = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => saleUpdateSchema.parse(input))
  .handler(async ({ data }) => {
    const { updateSale } = await import("@/lib/shop.server");
    return updateSale({
      id: data.id,
      soldAt: data.soldAt,
      note: data.note ?? null,
      items: data.items.map((i) => ({
        id: i.id ?? null,
        name: i.name,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
      })),
    });
  });

export const listSales = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => dateSchema.parse(input))
  .handler(async ({ data }) => {
    const { getSalesByDate } = await import("@/lib/shop.server");
    return getSalesByDate(data.date);
  });

export const monthTotals = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => monthSchema.parse(input))
  .handler(async ({ data }) => {
    const { getMonthTotals } = await import("@/lib/shop.server");
    return getMonthTotals(data.month);
  });

export const analytics = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => analyticsSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const { getAnalytics } = await import("@/lib/shop.server");
    return getAnalytics(data.year ?? null);
  });

export type SaleInput = z.infer<typeof saleInputSchema>;