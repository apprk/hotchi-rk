import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { AppNav } from "@/components/shop/AppNav";
import {
  addMenuItem,
  copyMenuFromDate,
  deleteMenuItem,
  listMenus,
  listPastMenus,
} from "@/lib/shop.functions";

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "日替わりメニュー設定 | 総菜屋の売上台帳" },
      {
        name: "description",
        content: "その日に販売するお惣菜の名前と値段を登録・編集できます。過去の日付からのコピーにも対応。",
      },
      { property: "og:title", content: "日替わりメニュー設定 | 総菜屋の売上台帳" },
      {
        property: "og:description",
        content: "その日に販売するお惣菜の名前と値段を登録・編集できます。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MenuPage,
});

function MenuPage() {
  const [date, setDate] = useState(todayString());
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  const addFn = useServerFn(addMenuItem);
  const deleteFn = useServerFn(deleteMenuItem);
  const copyFn = useServerFn(copyMenuFromDate);

  const menusQuery = useQuery({
    queryKey: ["menus", date],
    queryFn: () => listMenus({ data: { date } }),
  });
  const pastQuery = useQuery({ queryKey: ["pastMenus"], queryFn: () => listPastMenus() });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["menus", date] });
    queryClient.invalidateQueries({ queryKey: ["pastMenus"] });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const priceNumber = Number(price);
    if (!name.trim() || !Number.isInteger(priceNumber) || priceNumber < 0) {
      toast.error("メニュー名と正しい金額を入力してください");
      return;
    }
    setBusy(true);
    try {
      await addFn({ data: { date, name: name.trim(), price: priceNumber } });
      setName("");
      setPrice("");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "追加に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFn({ data: { id } });
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "削除に失敗しました");
    }
  }

  async function handleCopy() {
    if (!copyFrom) return;
    setBusy(true);
    try {
      const result = await copyFn({ data: { from: copyFrom, to: date } });
      toast.success(`${result.copied} 件コピーしました`);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "コピーに失敗しました");
    } finally {
      setBusy(false);
    }
  }

  const menus = menusQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />
      <AppNav />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">日替わりメニュー</h1>
          <div className="space-y-1">
            <Label htmlFor="menu-date" className="text-xs">
              営業日
            </Label>
            <Input
              id="menu-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
            />
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">メニューを追加</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
              <div className="min-w-40 flex-1 space-y-1">
                <Label htmlFor="name">メニュー名</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="唐揚げ"
                  maxLength={60}
                  list="past-menus"
                />
                <datalist id="past-menus">
                  {(pastQuery.data ?? []).map((m) => (
                    <option key={m.name} value={m.name} />
                  ))}
                </datalist>
              </div>
              <div className="w-32 space-y-1">
                <Label htmlFor="price">値段</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step={10}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="400"
                />
              </div>
              <Button type="submit" disabled={busy}>
                追加
              </Button>
            </form>

            {(pastQuery.data ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(pastQuery.data ?? []).slice(0, 12).map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => {
                      setName(m.name);
                      setPrice(String(m.price));
                    }}
                    className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
                  >
                    {m.name} ¥{m.price.toLocaleString()}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-end gap-3 border-t pt-4">
              <div className="space-y-1">
                <Label htmlFor="copy-from" className="text-xs">
                  別の日からコピー
                </Label>
                <Input
                  id="copy-from"
                  type="date"
                  value={copyFrom}
                  onChange={(e) => setCopyFrom(e.target.value)}
                  className="w-44"
                />
              </div>
              <Button variant="outline" onClick={handleCopy} disabled={!copyFrom || busy}>
                コピー
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{date} のラインナップ（{menus.length}品）</CardTitle>
          </CardHeader>
          <CardContent>
            {menus.length === 0 ? (
              <p className="text-sm text-muted-foreground">まだ登録されていません。</p>
            ) : (
              <ul className="divide-y">
                {menus.map((menu) => (
                  <li key={menu.id} className="flex items-center justify-between py-2">
                    <span>{menu.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums">¥{menu.price.toLocaleString()}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(menu.id)}
                        aria-label={`${menu.name}を削除`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}