import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { AppNav } from "@/components/shop/AppNav";
import { deleteSale, listSales, monthTotals } from "@/lib/shop.functions";
import { useQueryClient } from "@tanstack/react-query";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "売上履歴カレンダー | 総菜屋の売上台帳" },
      {
        name: "description",
        content: "カレンダーから日付を選んで、その日のお客さんごとの購入内容と金額を確認できます。",
      },
      { property: "og:title", content: "売上履歴カレンダー | 総菜屋の売上台帳" },
      {
        property: "og:description",
        content: "日付ごと・お客さんごとの購入明細をさかのぼって確認できます。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
  );
  const [openSale, setOpenSale] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const deleteSaleFn = useServerFn(deleteSale);

  const monthKey = `${year}-${pad(month + 1)}`;
  const totalsQuery = useQuery({
    queryKey: ["monthTotals", monthKey],
    queryFn: () => monthTotals({ data: { month: monthKey } }),
  });
  const salesQuery = useQuery({
    queryKey: ["sales", selected],
    queryFn: () => listSales({ data: { date: selected as string } }),
    enabled: Boolean(selected),
  });

  const totalsMap = new Map((totalsQuery.data ?? []).map((t) => [t.date, t]));
  const monthTotal = (totalsQuery.data ?? []).reduce((s, t) => s + t.total, 0);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  async function handleDeleteSale(id: string) {
    try {
      await deleteSaleFn({ data: { id } });
      toast.success("会計を削除しました");
      queryClient.invalidateQueries({ queryKey: ["sales", selected] });
      queryClient.invalidateQueries({ queryKey: ["monthTotals"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "削除に失敗しました");
    }
  }

  const sales = salesQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />
      <AppNav />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight">売上履歴</h1>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="前の月">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base">
              {year}年{month + 1}月 ・ ¥{monthTotal.toLocaleString()}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="次の月">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, index) => {
                if (day === null) return <div key={`empty-${index}`} />;
                const key = `${year}-${pad(month + 1)}-${pad(day)}`;
                const info = totalsMap.get(key);
                const isSelected = selected === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelected(key);
                      setOpenSale(null);
                    }}
                    className={`flex h-16 flex-col items-center justify-center rounded-md border text-xs transition-colors ${
                      isSelected ? "border-primary bg-primary/10" : "hover:bg-accent"
                    }`}
                  >
                    <span className="font-medium">{day}</span>
                    {info && (
                      <span className="mt-1 text-[10px] tabular-nums text-primary">
                        ¥{info.total.toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selected} ・ {sales.length}組 ・ ¥
                {sales.reduce((s, x) => s + x.total, 0).toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">読み込み中...</p>
              ) : sales.length === 0 ? (
                <p className="text-sm text-muted-foreground">この日の売上はありません。</p>
              ) : (
                <ul className="divide-y">
                  {sales.map((sale, index) => (
                    <li key={sale.id} className="py-2">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="flex flex-1 items-center justify-between text-left"
                          onClick={() => setOpenSale(openSale === sale.id ? null : sale.id)}
                        >
                          <span>
                            客{index + 1}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {new Date(sale.sold_at).toLocaleTimeString("ja-JP", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </span>
                          <span className="font-medium tabular-nums">
                            ¥{sale.total.toLocaleString()}
                          </span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSale(sale.id)}
                          aria-label="この会計を削除"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      {openSale === sale.id && (
                        <ul className="mt-2 space-y-1 rounded-md bg-muted/50 p-3 text-sm">
                          {sale.items.map((item) => (
                            <li key={item.id} className="flex justify-between">
                              <span>
                                {item.name} × {item.quantity}
                              </span>
                              <span className="tabular-nums">
                                ¥{(item.unit_price * item.quantity).toLocaleString()}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}