import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Minus, MonitorSmartphone, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { AppNav } from "@/components/shop/AppNav";
import { listMenus, listSales, registerSale } from "@/lib/shop.functions";
import type { MenuItem } from "@/lib/shop.types";

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "レジ | 総菜屋の売上台帳" },
      {
        name: "description",
        content: "日替わりメニューをタップするだけで合計金額を計算し、売上を記録できるお惣菜屋さん向けレジアプリ。",
      },
      { property: "og:title", content: "レジ | 総菜屋の売上台帳" },
      {
        property: "og:description",
        content: "日替わりメニューをタップして合計金額を即計算。売上は時間帯まで記録されます。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const [date, setDate] = useState(todayString());
  const [cart, setCart] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();
  const registerSaleFn = useServerFn(registerSale);
  const [isSaving, setIsSaving] = useState(false);
  const [customerView, setCustomerView] = useState(false);

  const menusQuery = useQuery({
    queryKey: ["menus", date],
    queryFn: () => listMenus({ data: { date } }),
  });
  const salesQuery = useQuery({
    queryKey: ["sales", date],
    queryFn: () => listSales({ data: { date } }),
  });

  const menus: MenuItem[] = menusQuery.data ?? [];
  const lines = useMemo(
    () =>
      menus
        .filter((m) => (cart[m.id] ?? 0) > 0)
        .map((m) => ({ menu: m, quantity: cart[m.id] ?? 0 })),
    [menus, cart],
  );
  const total = lines.reduce((sum, l) => sum + l.menu.price * l.quantity, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  function change(id: string, delta: number) {
    setCart((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      const copy = { ...prev };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  }

  async function submit() {
    if (lines.length === 0) return;
    setIsSaving(true);
    try {
      await registerSaleFn({
        data: {
          date,
          soldAt: new Date().toISOString(),
          note: null,
          items: lines.map((l) => ({
            menuItemId: l.menu.id,
            name: l.menu.name,
            unitPrice: l.menu.price,
            quantity: l.quantity,
          })),
        },
      });
      toast.success(`¥${total.toLocaleString()} を売上に登録しました`);
      setCart({});
      queryClient.invalidateQueries({ queryKey: ["sales", date] });
      queryClient.invalidateQueries({ queryKey: ["monthTotals"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登録に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }

  const daySales = salesQuery.data ?? [];
  const dayTotal = daySales.reduce((sum, s) => sum + s.total, 0);

  if (customerView) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-semibold tracking-tight">お会計</h2>
          <Button variant="outline" size="sm" onClick={() => setCustomerView(false)}>
            <X className="mr-1 h-4 w-4" />
            スタッフ画面へ
          </Button>
        </div>
        <div className="flex flex-1 flex-col justify-between px-6 py-6">
          {lines.length === 0 ? (
            <p className="text-center text-2xl text-muted-foreground">商品を選んでいます...</p>
          ) : (
            <ul className="space-y-4">
              {lines.map((l) => (
                <li key={l.menu.id} className="flex items-baseline justify-between border-b pb-3">
                  <span className="text-2xl font-medium sm:text-3xl">{l.menu.name}</span>
                  <span className="ml-4 text-lg tabular-nums text-muted-foreground sm:text-xl">
                    ¥{l.menu.price.toLocaleString()} × {l.quantity}
                  </span>
                  <span className="ml-4 w-32 text-right text-2xl font-semibold tabular-nums sm:text-3xl">
                    ¥{(l.menu.price * l.quantity).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8 rounded-lg bg-primary/10 px-6 py-6 text-right">
            <div className="text-lg text-muted-foreground">合計 {itemCount} 点</div>
            <div className="text-5xl font-bold tabular-nums text-primary sm:text-6xl">
              ¥{total.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <Toaster position="top-center" />
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">レジ</h1>
            <p className="text-sm text-muted-foreground">
              本日 {daySales.length} 組 / 売上 ¥{dayTotal.toLocaleString()}
            </p>
          </div>
          <div className="flex items-end gap-3">
            <Button variant="outline" onClick={() => setCustomerView(true)}>
              <MonitorSmartphone className="mr-1 h-4 w-4" />
              客用画面
            </Button>
            <div className="space-y-1">
            <Label htmlFor="date" className="text-xs">
              営業日
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setCart({});
              }}
              className="w-44"
            />
            </div>
          </div>
        </header>

        {menusQuery.isLoading ? (
          <p className="text-muted-foreground">読み込み中...</p>
        ) : menus.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 p-8 text-center">
              <p className="text-muted-foreground">この日のメニューがまだ登録されていません。</p>
              <Button asChild>
                <Link to="/menu">メニューを設定する</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {menus.map((menu) => {
              const qty = cart[menu.id] ?? 0;
              return (
                <Card
                  key={menu.id}
                  className={qty > 0 ? "border-primary ring-1 ring-primary" : undefined}
                >
                  <CardContent className="space-y-3 p-4">
                    <button
                      type="button"
                      onClick={() => change(menu.id, 1)}
                      className="w-full text-left"
                    >
                      <div className="text-base font-semibold">{menu.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ¥{menu.price.toLocaleString()}
                      </div>
                    </button>
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => change(menu.id, -1)}
                        disabled={qty === 0}
                        aria-label={`${menu.name}を減らす`}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="text-lg font-bold tabular-nums">{qty}</span>
                      <Button
                        size="icon"
                        onClick={() => change(menu.id, 1)}
                        aria-label={`${menu.name}を増やす`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {daySales.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base">この日の会計</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {daySales.map((sale, index) => (
                <div key={sale.id} className="flex justify-between border-b pb-2 text-sm last:border-0">
                  <span>
                    会計{index + 1}・
                    {new Date(sale.sold_at).toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="font-medium">¥{sale.total.toLocaleString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3">
          {lines.length > 0 && (
            <div className="mb-2 max-h-24 space-y-1 overflow-y-auto text-sm">
              {lines.map((l) => (
                <div key={l.menu.id} className="flex items-center justify-between">
                  <span className="truncate">
                    {l.menu.name} × {l.quantity}
                  </span>
                  <span className="tabular-nums">
                    ¥{(l.menu.price * l.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCart({})}
              disabled={lines.length === 0}
              aria-label="クリア"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">合計 {itemCount} 点</div>
              <div className="text-3xl font-bold tabular-nums">¥{total.toLocaleString()}</div>
            </div>
            <Button size="lg" onClick={submit} disabled={lines.length === 0 || isSaving}>
              {isSaving ? "登録中..." : "会計を登録"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}