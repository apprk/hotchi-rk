import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const recordSchema = z.object({
  date: z.string().date(),
  type: z.enum(["income", "expense"]),
  category: z.string().trim().min(1, { message: "分類を入力してください" }).max(50),
  amount: z.coerce.number().int().positive({ message: "金額は1円以上にしてください" }),
  note: z.string().trim().max(200).optional().nullable(),
});

const idSchema = z.object({
  id: z.string().uuid(),
});

function createServerClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw new Error("Backend configuration is missing");
  }
  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const listRecords = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("account_records")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
});

export const createRecord = createServerFn({ method: "POST" })
  .inputValidator((input) => recordSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = createServerClient();
    const { data: inserted, error } = await supabase
      .from("account_records")
      .insert({
        date: data.date,
        type: data.type,
        category: data.category,
        amount: data.amount,
        note: data.note ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return inserted;
  });

export const deleteRecord = createServerFn({ method: "POST" })
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = createServerClient();
    const { error } = await supabase.from("account_records").delete().eq("id", data.id);

    if (error) {
      throw new Error(error.message);
    }
    return { success: true };
  });

export const getMonthlySummary = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("account_records").select("date, type, amount");

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const summary = new Map<string, { month: string; income: number; expense: number }>();

  for (const row of rows) {
    const month = row.date.slice(0, 7); // YYYY-MM
    const current = summary.get(month) ?? { month, income: 0, expense: 0 };
    if (row.type === "income") {
      current.income += row.amount;
    } else {
      current.expense += row.amount;
    }
    summary.set(month, current);
  }

  return Array.from(summary.values()).sort((a, b) => a.month.localeCompare(b.month));
});
