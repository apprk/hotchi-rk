import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Calculator, Minus, MonitorSmartphone, Percent, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { AppNav } from "@/components/shop/AppNav";
import { ShopLogo } from "@/components/shop/ShopLogo";
import { listMenus, listSales, registerSale } from "@/lib/shop.functions";
import { useSettings, yen } from "@/lib/settings";
import type { MenuItem } from "@/lib/shop.types";

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "レジ | mnmrk" },
      {
        name: "description",
        content: "日替わりメニューをタップするだけで合計金額を計算し、売上を記録できるお惣菜屋さん向けレジアプリ。",
      },
      { property: "og:title", content: "レジ | mnmrk" },
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
  const [search, setSearch] = useState("");
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountMode, setDiscountMode] = useState<"yen" | "percent">("yen");
  const [discountInput, setDiscountInput] = useState("");
  const [discount, setDiscount] = useState<{ type: "yen" | "percent"; value: number } | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const [received, setReceived] = useState("");
  const settings = useSettings();

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
  const subtotal = lines.reduce((sum, l) => sum + l.menu.price * l.quantity, 0);
  const discountAmount = !discount
    ? 0
    : Math.min(
        subtotal,
        discount.type === "yen"
          ? Math.round(discount.value)
          : Math.round((subtotal * discount.value) / 100),
      );
  const total = Math.max(0, subtotal - discountAmount);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const visibleMenus = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return menus;
    return menus.filter((m) => m.name.toLowerCase().includes(q));
  }, [menus, search]);
  const discountLabel = discount
    ? discount.type === "yen"
      ? `${discount.value.toLocaleString()}円引き`
      : `${discount.value}％引き`
    : null;

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
          discount: discount ? { type: discount.type, value: discount.value } : null,
          items: lines.map((l) => ({
            menuItemId: l.menu.id,
            name: l.menu.name,
            unitPrice: l.menu.price,
            quantity: l.quantity,
          })),
        },
      });
      toast.success(`${yen(total)} を売上に登録しました`);
      setCart({});
      setDiscount(null);
      setReceived("");
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
  const receivedNumber = Number(received);
  const changeAmount = Number.isFinite(receivedNumber) ? receivedNumber - total : 0;

  if (customerView) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <ShopLogo className="h-12 w-12" />
            <div>
              <h2 className="text-xl font-semibold tracking-tight">お会計</h2>
              <p className="text-xs text-muted-foreground">{settings.shopName}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCustomerView(false)}>
            <X className="mr-1 h-4 w-4" />
            スタッフ画面へ
          </Button>
        </div>
        <div className="flex flex-1 flex-col justify-between px-6 py-6">
          {lines.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <ShopLogo className="h-56 w-56 opacity-90" />
              <p className="text-center text-xl text-muted-foreground">いらっしゃいませ</p>
            </div>
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
            {discountLabel && (
              <div className="text-base text-muted-foreground">
                {discountLabel}（-{yen(discountAmount)}）
              </div>
            )}
            <div className="text-5xl font-bold tabular-nums text-primary sm:text-6xl">
              {yen(total)}
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
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Button variant="outline" onClick={() => setCustomerView(true)}>
              <MonitorSmartphone className="mr-1 h-4 w-4" />
              会計画面
            </Button>
            <Button variant="outline" onClick={() => setDiscountOpen(true)}>
              <Percent className="mr-1 h-4 w-4" />
              割引
            </Button>
            <Button variant="outline" onClick={() => setChangeOpen(true)}>
              <Calculator className="mr-1 h-4 w-4" />
              お釣り計算
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

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="商品を検索"
            className="pl-9"
            aria-label="商品検索"
          />
        </div>

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
        ) : visibleMenus.length === 0 ? (
          <p className="text-sm text-muted-foreground">「{search}」に一致する商品はありません。</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleMenus.map((menu) => {
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
              <CardTitle className="text-base">この日の会計（{daySales.length}組）</CardTitle>
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
                  <span className="font-medium">{yen(sale.total)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>割引</DialogTitle>
            <DialogDescription>現在の小計 {yen(subtotal)} に割引を適用します。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={discountMode === "yen" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setDiscountMode("yen")}
              >
                円引き
              </Button>
              <Button
                variant={discountMode === "percent" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setDiscountMode("percent")}
              >
                ％引き
              </Button>
            </div>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              placeholder={discountMode === "yen" ? "100" : "10"}
              aria-label="割引の値"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setDiscount(null);
                  setDiscountInput("");
                  setDiscountOpen(false);
                }}
              >
                割引を解除
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  const value = Number(discountInput);
                  if (!Number.isFinite(value) || value <= 0) {
                    toast.error("割引の値を入力してください");
                    return;
                  }
                  setDiscount({ type: discountMode, value: Math.round(value) });
                  setDiscountOpen(false);
                }}
              >
                適用する
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>お釣り計算</DialogTitle>
            <DialogDescription>会計金額 {yen(total)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="received">お預かり金額</Label>
              <Input
                id="received"
                type="number"
                min={0}
                inputMode="numeric"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                placeholder="1000"
              />
            </div>
            <div className="rounded-lg bg-primary/10 px-4 py-4 text-right">
              <div className="text-xs text-muted-foreground">お釣り</div>
              <div className="text-3xl font-bold tabular-nums text-primary">
                {received === "" || changeAmount < 0 ? "—" : yen(changeAmount)}
              </div>
              {changeAmount < 0 && received !== "" && (
                <p className="text-xs text-destructive">預かり金額が不足しています</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              onClick={() => {
                setCart({});
                setDiscount(null);
              }}
              disabled={lines.length === 0}
              aria-label="クリア"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">
                合計 {itemCount} 点
                {discountLabel ? ` ・ ${discountLabel}（-${yen(discountAmount)}）` : ""}
              </div>
              <div className="text-3xl font-bold tabular-nums">{yen(total)}</div>
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