import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Copy, GripVertical, Pencil, Trash2, X } from "lucide-react";
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
  reorderMenuItems,
  updateMenuItem,
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);
  const queryClient = useQueryClient();

  const addFn = useServerFn(addMenuItem);
  const deleteFn = useServerFn(deleteMenuItem);
  const copyFn = useServerFn(copyMenuFromDate);
  const updateFn = useServerFn(updateMenuItem);
  const reorderFn = useServerFn(reorderMenuItems);

  const menusQuery = useQuery({
    queryKey: ["menus", date],
    queryFn: () => listMenus({ data: { date } }),
  });
  const pastQuery = useQuery({ queryKey: ["pastMenus"], queryFn: () => listPastMenus() });

  function refresh() {
    setOrder(null);
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

  async function handleSaveEdit(id: string) {
    const priceNumber = Number(editPrice);
    if (!editName.trim() || !Number.isInteger(priceNumber) || priceNumber < 0) {
      toast.error("メニュー名と正しい金額を入力してください");
      return;
    }
    try {
      await updateFn({ data: { id, name: editName.trim(), price: priceNumber } });
      setEditingId(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新に失敗しました");
    }
  }

  async function handleClipboardCopy(menu: { name: string; price: number }) {
    const text = `${menu.name}　￥${menu.price.toLocaleString()}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      toast.success(`コピーしました：${text}`);
    } catch {
      toast.error("コピーできませんでした");
    }
  }

  async function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = displayMenus.map((m) => m.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0] as string);
    setOrder(ids);
    setDragId(null);
    try {
      await reorderFn({ data: { ids } });
      queryClient.invalidateQueries({ queryKey: ["menus", date] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "並び替えに失敗しました");
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
  const displayMenus = order
    ? order.map((id) => menus.find((m) => m.id === id)).filter((m): m is (typeof menus)[number] => Boolean(m))
    : menus;

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
                <li className="pb-2 text-xs text-muted-foreground">
                  左のハンドルをドラッグすると並び順を変更できます（レジ画面にも反映されます）。
                </li>
                {displayMenus.map((menu) => (
                  <li
                    key={menu.id}
                    className={`py-2 ${dragId === menu.id ? "opacity-50" : ""}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(menu.id)}
                  >
                    {editingId === menu.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="min-w-32 flex-1"
                          maxLength={60}
                          aria-label="メニュー名"
                        />
                        <Input
                          type="number"
                          min={0}
                          step={10}
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-28"
                          aria-label="値段"
                        />
                        <Button size="icon" onClick={() => handleSaveEdit(menu.id)} aria-label="保存">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          aria-label="キャンセル"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span
                            draggable
                            onDragStart={() => setDragId(menu.id)}
                            onDragEnd={() => setDragId(null)}
                            className="cursor-grab text-muted-foreground active:cursor-grabbing"
                            aria-label="ドラッグして並び替え"
                          >
                            <GripVertical className="h-4 w-4" />
                          </span>
                          {menu.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="mr-2 tabular-nums">¥{menu.price.toLocaleString()}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingId(menu.id);
                              setEditName(menu.name);
                              setEditPrice(String(menu.price));
                            }}
                            aria-label={`${menu.name}を編集`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleClipboardCopy(menu)}
                            aria-label={`${menu.name}をクリップボードにコピー`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(menu.id)}
                            aria-label={`${menu.name}を削除`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )}
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