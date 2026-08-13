import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/sonner";
import { AppNav } from "@/components/shop/AppNav";
import { SaleEditDialog } from "@/components/shop/SaleEditDialog";
import {
  deleteSale,
  fetchDayNote,
  listSales,
  monthTotals,
  saveDayNoteFn,
} from "@/lib/shop.functions";
import { taxBreakdown, useSettings, yen } from "@/lib/settings";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "売上履歴カレンダー | mnmrk" },
      {
        name: "description",
        content: "カレンダーから日付を選んで、その日のお客さんごとの購入内容と金額を確認できます。",
      },
      { property: "og:title", content: "売上履歴カレンダー | mnmrk" },
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const deleteSaleFn = useServerFn(deleteSale);
  const saveNoteFn = useServerFn(saveDayNoteFn);
  const settings = useSettings();
  const [memo, setMemo] = useState("");
  const [savingMemo, setSavingMemo] = useState(false);

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
  const noteQuery = useQuery({
    queryKey: ["dayNote", selected],
    queryFn: () => fetchDayNote({ data: { date: selected as string } }),
    enabled: Boolean(selected),
  });

  useEffect(() => {
    setMemo(noteQuery.data ?? "");
  }, [noteQuery.data, selected]);

  async function handleSaveMemo() {
    if (!selected) return;
    setSavingMemo(true);
    try {
      await saveNoteFn({ data: { date: selected, note: memo } });
      toast.success("メモを保存しました");
      queryClient.invalidateQueries({ queryKey: ["dayNote", selected] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setSavingMemo(false);
    }
  }

  const totalsMap = new Map((totalsQuery.data ?? []).map((t) => [t.date, t]));
  const monthTotal = (totalsQuery.data ?? []).reduce((s, t) => s + t.total, 0);
  const monthTax = taxBreakdown(monthTotal, settings.taxRate);

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

  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    queryClient.invalidateQueries({ queryKey: ["monthTotals"] });
    queryClient.invalidateQueries({ queryKey: ["analytics"] });
  }

  async function handleDeleteSale(id: string) {
    try {
      await deleteSaleFn({ data: { id } });
      toast.success("会計を削除しました");
      refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  }

  const sales = salesQuery.data ?? [];
  const dayGross = sales.reduce((s, x) => s + x.total, 0);
  const dayTax = taxBreakdown(dayGross, settings.taxRate);

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
            <div className="text-center">
              <CardTitle className="text-base">
                {year}年{month + 1}月 ・ {yen(monthTotal)}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                税抜 {yen(monthTax.net)} ／ 消費税({settings.taxRate}%) {yen(monthTax.tax)} ／ 税込{" "}
                {yen(monthTax.gross)}
              </p>
            </div>
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
                        {yen(info.total)}
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
                {selected} ・ {sales.length}組 ・ {yen(dayGross)}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                税抜 {yen(dayTax.net)} ／ 消費税({settings.taxRate}%) {yen(dayTax.tax)} ／ 税込{" "}
                {yen(dayTax.gross)}
              </p>
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
                            会計{index + 1}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {new Date(sale.sold_at).toLocaleTimeString("ja-JP", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </span>
                          <span className="font-medium tabular-nums">
                            {yen(sale.total)}
                          </span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingId(sale.id)}
                          aria-label="この会計を編集"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingId(sale.id)}
                          aria-label="この会計を削除"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      {openSale === sale.id && (
                        <div className="mt-2 space-y-2 rounded-md bg-muted/50 p-3 text-sm">
                          <ul className="space-y-1">
                            {sale.items.map((item) => (
                              <li key={item.id} className="flex justify-between">
                                <span>
                                  {item.name} × {item.quantity}
                                </span>
                                <span className="tabular-nums">
                                  {yen(item.unit_price * item.quantity)}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <div className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
                            {sale.discount_amount > 0 && (
                              <>
                                <div className="flex justify-between">
                                  <span>割引前金額</span>
                                  <span className="tabular-nums">
                                    {yen(sale.subtotal ?? sale.total + sale.discount_amount)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>
                                    割引（
                                    {sale.discount_type === "percent"
                                      ? `${sale.discount_value ?? 0}％引き`
                                      : `${yen(sale.discount_value ?? 0)}引き`}
                                    ）
                                  </span>
                                  <span className="tabular-nums">-{yen(sale.discount_amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>割引後金額</span>
                                  <span className="tabular-nums">{yen(sale.total)}</span>
                                </div>
                              </>
                            )}
                            {(() => {
                              const t = taxBreakdown(sale.total, settings.taxRate);
                              return (
                                <>
                                  <div className="flex justify-between">
                                    <span>税抜金額</span>
                                    <span className="tabular-nums">{yen(t.net)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>消費税（{settings.taxRate}%）</span>
                                    <span className="tabular-nums">{yen(t.tax)}</span>
                                  </div>
                                  <div className="flex justify-between font-medium text-foreground">
                                    <span>税込金額</span>
                                    <span className="tabular-nums">{yen(t.gross)}</span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                      {editingId === sale.id && (
                        <SaleEditDialog
                          sale={sale}
                          label={`会計${index + 1}`}
                          open
                          onOpenChange={(open) => !open && setEditingId(null)}
                          onSaved={refreshAll}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{selected} の日別メモ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="雨天で来客少なめ / イベント出店 / 臨時休業 など"
              />
              <div className="flex justify-end">
                <Button onClick={handleSaveMemo} disabled={savingMemo}>
                  {savingMemo ? "保存中..." : "メモを保存"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={Boolean(deletingId)} onOpenChange={(open) => !open && setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>この会計を削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                削除すると明細も含めて元に戻せません。売上集計からも除外されます。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={() => deletingId && handleDeleteSale(deletingId)}>
                削除する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}