import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Analytics, DayTotal, MenuItem, NamedTotal, Sale } from "@/lib/shop.types";

function client() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Backend configuration is missing");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getMenus(date: string): Promise<MenuItem[]> {
  const { data, error } = await client()
    .from("menu_items")
    .select("id, date, name, price, sort_order")
    .eq("date", date)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addMenu(input: { date: string; name: string; price: number }) {
  const supabase = client();
  const { count } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("date", input.date);
  const { data, error } = await supabase
    .from("menu_items")
    .insert({ ...input, sort_order: count ?? 0 })
    .select("id, date, name, price, sort_order")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function editMenu(input: { id: string; name: string; price: number }) {
  const { error } = await client()
    .from("menu_items")
    .update({ name: input.name, price: input.price })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function removeMenu(id: string) {
  const { error } = await client().from("menu_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function copyMenus(input: { from: string; to: string }) {
  const source = await getMenus(input.from);
  if (source.length === 0) return { copied: 0 };
  const existing = await getMenus(input.to);
  const offset = existing.length;
  const { error } = await client().from("menu_items").insert(
    source.map((m, i) => ({
      date: input.to,
      name: m.name,
      price: m.price,
      sort_order: offset + i,
    })),
  );
  if (error) throw new Error(error.message);
  return { copied: source.length };
}

export async function reorderMenus(ids: string[]) {
  const supabase = client();
  for (let i = 0; i < ids.length; i += 1) {
    const { error } = await supabase
      .from("menu_items")
      .update({ sort_order: i })
      .eq("id", ids[i] as string);
    if (error) throw new Error(error.message);
  }
  return { success: true };
}

export async function getPastMenuNames(): Promise<{ name: string; price: number }[]> {
  const { data, error } = await client()
    .from("menu_items")
    .select("name, price, date")
    .order("date", { ascending: false })
    .limit(400);
  if (error) throw new Error(error.message);
  const seen = new Map<string, { name: string; price: number }>();
  for (const row of data ?? []) {
    if (!seen.has(row.name)) seen.set(row.name, { name: row.name, price: row.price });
  }
  return Array.from(seen.values()).slice(0, 60);
}

export async function createSale(input: {
  date: string;
  soldAt: string;
  note: string | null;
  discount?: { type: "yen" | "percent" | null; value: number } | null;
  items: { menuItemId: string | null; name: string; unitPrice: number; quantity: number }[];
}) {
  const supabase = client();
  const subtotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const discountAmount = computeDiscount(subtotal, input.discount ?? null);
  const total = Math.max(0, subtotal - discountAmount);
  const { data: sale, error } = await supabase
    .from("sales")
    .insert({
      date: input.date,
      sold_at: input.soldAt,
      total,
      note: input.note,
      subtotal,
      discount_type: input.discount?.type ?? null,
      discount_value: input.discount?.type ? Math.round(input.discount.value) : null,
      discount_amount: discountAmount,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: itemError } = await supabase.from("sale_items").insert(
    input.items.map((i) => ({
      sale_id: sale.id,
      menu_item_id: i.menuItemId,
      name: i.name,
      unit_price: i.unitPrice,
      quantity: i.quantity,
    })),
  );
  if (itemError) {
    await supabase.from("sales").delete().eq("id", sale.id);
    throw new Error(itemError.message);
  }
  return { id: sale.id, total };
}

export function computeDiscount(
  subtotal: number,
  discount: { type: "yen" | "percent" | null; value: number } | null,
): number {
  if (!discount || !discount.type || !discount.value) return 0;
  const amount =
    discount.type === "yen"
      ? Math.round(discount.value)
      : Math.round((subtotal * discount.value) / 100);
  return Math.min(Math.max(0, amount), subtotal);
}

export async function removeSale(id: string) {
  const { error } = await client().from("sales").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function updateSale(input: {
  id: string;
  soldAt: string;
  note: string | null;
  items: { id?: string | null; name: string; unitPrice: number; quantity: number }[];
}) {
  const supabase = client();
  const total = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const { data: existing, error: existingError } = await supabase
    .from("sale_items")
    .select("id")
    .eq("sale_id", input.id);
  if (existingError) throw new Error(existingError.message);

  const keptIds = input.items.map((i) => i.id).filter((id): id is string => Boolean(id));
  const removed = (existing ?? []).map((i) => i.id).filter((id) => !keptIds.includes(id));
  if (removed.length > 0) {
    const { error } = await supabase.from("sale_items").delete().in("id", removed);
    if (error) throw new Error(error.message);
  }

  for (const item of input.items) {
    if (item.id) {
      const { error } = await supabase
        .from("sale_items")
        .update({ name: item.name, unit_price: item.unitPrice, quantity: item.quantity })
        .eq("id", item.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("sale_items").insert({
        sale_id: input.id,
        menu_item_id: null,
        name: item.name,
        unit_price: item.unitPrice,
        quantity: item.quantity,
      });
      if (error) throw new Error(error.message);
    }
  }

  const soldAt = new Date(input.soldAt);
  const date = `${soldAt.getFullYear()}-${String(soldAt.getMonth() + 1).padStart(2, "0")}-${String(soldAt.getDate()).padStart(2, "0")}`;
  const { error } = await supabase
    .from("sales")
    .update({ sold_at: input.soldAt, note: input.note, total, date })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
  return { success: true, total };
}

export async function getSalesByDate(date: string): Promise<Sale[]> {
  const supabase = client();
  const { data: sales, error } = await supabase
    .from("sales")
    .select("id, date, sold_at, total, note, original_sold_at, original_total, original_note")
    .eq("date", date)
    .order("sold_at", { ascending: true });
  if (error) throw new Error(error.message);
  const ids = (sales ?? []).map((s) => s.id);
  if (ids.length === 0) return [];

  const { data: items, error: itemError } = await supabase
    .from("sale_items")
    .select(
      "id, sale_id, name, unit_price, quantity, original_name, original_unit_price, original_quantity, created_at",
    )
    .in("sale_id", ids);
  if (itemError) throw new Error(itemError.message);

  return (sales ?? []).map((s) => ({
    ...s,
    items: (items ?? [])
      .filter((i) => i.sale_id === s.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((i) => ({
        id: i.id,
        name: i.name,
        unit_price: i.unit_price,
        quantity: i.quantity,
        original_name: i.original_name,
        original_unit_price: i.original_unit_price,
        original_quantity: i.original_quantity,
      })),
  }));
}

export async function getMonthTotals(month: string): Promise<DayTotal[]> {
  const start = `${month}-01`;
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1));
  const end = endDate.toISOString().slice(0, 10);

  const { data, error } = await client()
    .from("sales")
    .select("date, total")
    .gte("date", start)
    .lt("date", end);
  if (error) throw new Error(error.message);

  const map = new Map<string, DayTotal>();
  for (const row of data ?? []) {
    const current = map.get(row.date) ?? { date: row.date, total: 0, count: 0 };
    current.total += row.total;
    current.count += 1;
    map.set(row.date, current);
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export async function getAnalytics(year: number | null): Promise<Analytics> {
  const supabase = client();
  const { data: sales, error } = await supabase.from("sales").select("id, date, sold_at, total");
  if (error) throw new Error(error.message);
  const { data: items, error: itemError } = await supabase
    .from("sale_items")
    .select("sale_id, name, unit_price, quantity");
  if (itemError) throw new Error(itemError.message);

  const years = Array.from(new Set((sales ?? []).map((s) => Number(s.date.slice(0, 4)))))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a);

  const filteredSales = (sales ?? []).filter(
    (s) => year === null || Number(s.date.slice(0, 4)) === year,
  );
  const saleIds = new Set(filteredSales.map((s) => s.id));
  const filteredItems = (items ?? []).filter((i) => saleIds.has(i.sale_id));

  const monthly = new Map<string, NamedTotal>();
  const weekday = new Map<string, NamedTotal>();
  const hourly = new Map<string, NamedTotal>();

  for (const s of filteredSales) {
    const month = s.date.slice(0, 7);
    const m = monthly.get(month) ?? { key: month, total: 0, count: 0 };
    m.total += s.total;
    m.count += 1;
    monthly.set(month, m);

    const d = new Date(s.sold_at);
    const wKey = WEEKDAYS[d.getDay()] ?? "?";
    const w = weekday.get(wKey) ?? { key: wKey, total: 0, count: 0 };
    w.total += s.total;
    w.count += 1;
    weekday.set(wKey, w);

    const hKey = `${String(d.getHours()).padStart(2, "0")}:${d.getMinutes() < 30 ? "00" : "30"}`;
    const h = hourly.get(hKey) ?? { key: hKey, total: 0, count: 0 };
    h.total += s.total;
    h.count += 1;
    hourly.set(hKey, h);
  }

  const menus = new Map<string, NamedTotal>();
  for (const i of filteredItems) {
    const entry = menus.get(i.name) ?? { key: i.name, total: 0, count: 0 };
    entry.total += i.unit_price * i.quantity;
    entry.count += i.quantity;
    menus.set(i.name, entry);
  }

  return {
    years,
    monthly: Array.from(monthly.values()).sort((a, b) => a.key.localeCompare(b.key)),
    weekday: WEEKDAYS.map((w) => weekday.get(w) ?? { key: w, total: 0, count: 0 }),
    hourly: Array.from(hourly.values()).sort((a, b) => a.key.localeCompare(b.key)),
    menus: Array.from(menus.values()).sort((a, b) => b.total - a.total),
  };
}