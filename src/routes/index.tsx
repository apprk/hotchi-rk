import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

import {
  listRecords,
  createRecord,
  deleteRecord,
  getMonthlySummary,
} from "@/lib/accounting.functions";
import { SummaryCards } from "@/components/accounting/SummaryCards";
import { RecordForm } from "@/components/accounting/RecordForm";
import { RecordList } from "@/components/accounting/RecordList";
import { MonthlyChart } from "@/components/accounting/MonthlyChart";

const recordsQueryOptions = queryOptions({
  queryKey: ["account_records"],
  queryFn: () => listRecords(),
});

const summaryQueryOptions = queryOptions({
  queryKey: ["account_records_monthly_summary"],
  queryFn: () => getMonthlySummary(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "御総菜屋会計" },
      { name: "description", content: "お惣菜屋さんの売上・支出を簡単に記録・集計できるアプリ" },
      { property: "og:title", content: "御総菜屋会計" },
      { property: "og:description", content: "お惣菜屋さんの売上・支出を簡単に記録・集計できるアプリ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(recordsQueryOptions);
    context.queryClient.ensureQueryData(summaryQueryOptions);
  },
  component: HomePage,
});

function HomePage() {
  const { data: records } = useSuspenseQuery(recordsQueryOptions);
  const { data: monthlySummary } = useSuspenseQuery(summaryQueryOptions);
  const queryClient = Route.useRouteContext().queryClient;

  const createRecordFn = useServerFn(createRecord);
  const deleteRecordFn = useServerFn(deleteRecord);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const totals = records.reduce(
    (acc, record) => {
      if (record.type === "income") {
        acc.income += record.amount;
      } else {
        acc.expense += record.amount;
      }
      return acc;
    },
    { income: 0, expense: 0 },
  );

  async function handleAddRecord(input: {
    date: string;
    type: "income" | "expense";
    category: string;
    amount: number;
    note: string | null;
  }) {
    setIsSubmitting(true);
    try {
      await createRecordFn({ data: input });
      toast.success("記録を追加しました");
      queryClient.invalidateQueries({ queryKey: ["account_records"] });
      queryClient.invalidateQueries({ queryKey: ["account_records_monthly_summary"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteRecord(id: string) {
    setIsDeleting(true);
    try {
      await deleteRecordFn({ data: { id } });
      toast.success("記録を削除しました");
      queryClient.invalidateQueries({ queryKey: ["account_records"] });
      queryClient.invalidateQueries({ queryKey: ["account_records_monthly_summary"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">御総菜屋会計</h1>
          <p className="mt-2 text-muted-foreground">売上・支出を簡単に記録して、日々の経営を可視化</p>
        </header>

        <SummaryCards income={totals.income} expense={totals.expense} />

        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>新規記録</CardTitle>
              </CardHeader>
              <CardContent>
                <RecordForm onSubmit={handleAddRecord} isSubmitting={isSubmitting} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8 lg:col-span-8">
            <RecordList records={records} onDelete={handleDeleteRecord} isDeleting={isDeleting} />
            <MonthlyChart data={monthlySummary} />
          </div>
        </div>
      </div>
    </div>
  );
}
