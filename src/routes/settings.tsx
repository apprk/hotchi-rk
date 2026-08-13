import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppNav } from "@/components/shop/AppNav";
import { ShopLogo } from "@/components/shop/ShopLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
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
import { exportAllData, restoreAllData } from "@/lib/shop.functions";
import {
  APP_VERSION,
  DEFAULT_SETTINGS,
  readSettings,
  resetSettings,
  signOut,
  writeSettings,
  type AppSettings,
} from "@/lib/settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "設定 | mnmrk" },
      {
        name: "description",
        content: "店舗名・電話番号・消費税率・レジのパスワード・CSV出力やバックアップを管理できます。",
      },
      { property: "og:title", content: "設定 | mnmrk" },
      { property: "og:description", content: "税率やパスワード、データ出力の設定画面です。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function download(filename: string, content: string, type: string) {
  const blob = new Blob([`\uFEFF${content}`], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function SettingsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-background">
        <Toaster position="top-center" />
        <AppNav />
        <main className="mx-auto max-w-sm px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">設定パスワード</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                設定画面を開くにはパスワードを入力してください。
              </p>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="0000"
                aria-label="設定パスワード"
              />
              {pinError && <p className="text-sm text-destructive">パスワードが違います</p>}
              <Button
                className="w-full"
                onClick={() => {
                  if (pinInput === readSettings().password) setUnlocked(true);
                  else {
                    setPinError(true);
                    setPinInput("");
                  }
                }}
              >
                開く
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return <SettingsContent />;
}

function SettingsContent() {
  const [form, setForm] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [newPin, setNewPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const exportFn = useServerFn(exportAllData);
  const restoreFn = useServerFn(restoreAllData);

  useEffect(() => {
    setForm(readSettings());
  }, []);

  function save(next: Partial<AppSettings>) {
    const merged = writeSettings(next);
    setForm(merged);
  }

  async function handleExport(kind: "sales" | "menus" | "backup") {
    setBusy(true);
    try {
      const data = await exportFn();
      if (kind === "backup") {
        download(
          `hotchi-backup-${new Date().toISOString().slice(0, 10)}.json`,
          JSON.stringify(data),
          "application/json",
        );
      } else if (kind === "menus") {
        const rows = [
          ["日付", "商品名", "金額", "並び順"],
          ...data.menus.map((m) => [m.date, m.name, m.price, m.sort_order]),
        ];
        download(
          "hotchi-menus.csv",
          rows.map((r) => r.map(csvEscape).join(",")).join("\n"),
          "text/csv",
        );
      } else {
        const itemsBySale = new Map<string, string[]>();
        for (const i of data.saleItems) {
          const list = itemsBySale.get(i.sale_id) ?? [];
          list.push(`${i.name}x${i.quantity}(¥${i.unit_price})`);
          itemsBySale.set(i.sale_id, list);
        }
        const rate = form.taxRate;
        const rows = [
          ["日付", "時刻", "税込金額", "税抜金額", "消費税額", "割引額", "明細"],
          ...data.sales.map((s) => {
            const net = Math.round(s.total / (1 + rate / 100));
            return [
              s.date,
              new Date(s.sold_at).toLocaleTimeString("ja-JP"),
              s.total,
              net,
              s.total - net,
              s.discount_amount ?? 0,
              (itemsBySale.get(s.id) ?? []).join(" / "),
            ];
          }),
        ];
        download(
          "hotchi-sales.csv",
          rows.map((r) => r.map(csvEscape).join(",")).join("\n"),
          "text/csv",
        );
      }
      toast.success("書き出しました");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "書き出しに失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(file: File) {
    setBusy(true);
    try {
      const text = await file.text();
      const result = await restoreFn({ data: { payload: text } });
      toast.success(`復元しました（会計${result.sales}件 / 商品${result.menus}件）`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "復元に失敗しました");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />
      <AppNav />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <header className="flex items-center gap-4">
          <ShopLogo className="h-16 w-16" />
          <h1 className="text-2xl font-bold tracking-tight">設定</h1>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="shopName">店舗名</Label>
              <Input
                id="shopName"
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                onBlur={() => save({ shopName: form.shopName })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">電話番号</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                onBlur={() => save({ phone: form.phone })}
                placeholder="000-0000-0000"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="taxRate">適用税率（％）</Label>
              <Input
                id="taxRate"
                type="number"
                min={0}
                max={100}
                step={1}
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
                onBlur={() => save({ taxRate: Number.isFinite(form.taxRate) ? form.taxRate : 8 })}
                className="w-32"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">セキュリティ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="authEnabled">起動時のパスワード認証</Label>
                <p className="text-xs text-muted-foreground">30日間は再入力不要です。</p>
              </div>
              <Switch
                id="authEnabled"
                checked={form.authEnabled}
                onCheckedChange={(checked) => save({ authEnabled: checked })}
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="pin">新しい4桁パスワード</Label>
                <Input
                  id="pin"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  className="w-32"
                  placeholder="0000"
                />
              </div>
              <Button
                onClick={() => {
                  if (newPin.length !== 4) {
                    toast.error("4桁の数字を入力してください");
                    return;
                  }
                  save({ password: newPin });
                  setNewPin("");
                  toast.success("パスワードを変更しました");
                }}
              >
                変更する
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">売上・データ</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" disabled={busy} onClick={() => handleExport("sales")}>
              売上CSV出力
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => handleExport("menus")}>
              商品CSV出力
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => handleExport("backup")}>
              データバックアップ
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
              データ復元
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleRestore(file);
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">その他</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">アプリバージョン {APP_VERSION}</p>
            <Button variant="destructive" onClick={() => setResetOpen(true)}>
              初期設定へリセット
            </Button>
          </CardContent>
        </Card>

        <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>設定を初期化しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                店舗名・税率・パスワードなどの端末内設定が初期値に戻ります。売上や商品のデータは削除されません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  resetSettings();
                  setForm(DEFAULT_SETTINGS);
                  setResetOpen(false);
                  toast.success("初期設定に戻しました");
                }}
              >
                リセットする
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}