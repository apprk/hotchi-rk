import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSaleRecord } from "@/lib/shop.functions";
import type { Sale } from "@/lib/shop.types";

interface Row {
  id: string | null;
  name: string;
  unitPrice: string;
  quantity: string;
  originalName: string | null;
  originalUnitPrice: number | null;
  originalQuantity: number | null;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] text-muted-foreground/70">{children}</span>;
}

export function SaleEditDialog({
  sale,
  label,
  open,
  onOpenChange,
  onSaved,
}: {
  sale: Sale;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const updateFn = useServerFn(updateSaleRecord);
  const [soldAt, setSoldAt] = useState(() => toLocalInput(sale.sold_at));
  const [note, setNote] = useState(sale.note ?? "");
  const [rows, setRows] = useState<Row[]>(() =>
    sale.items.map((i) => ({
      id: i.id,
      name: i.name,
      unitPrice: String(i.unit_price),
      quantity: String(i.quantity),
      originalName: i.original_name,
      originalUnitPrice: i.original_unit_price,
      originalQuantity: i.original_quantity,
    })),
  );
  const [saving, setSaving] = useState(false);

  const total = rows.reduce(
    (sum, r) => sum + (Number(r.unitPrice) || 0) * (Number(r.quantity) || 0),
    0,
  );

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function save() {
    const items = rows.map((r) => ({
      id: r.id,
      name: r.name.trim(),
      unitPrice: Number(r.unitPrice),
      quantity: Number(r.quantity),
    }));
    if (
      items.length === 0 ||
      items.some(
        (i) =>
          !i.name ||
          !Number.isInteger(i.unitPrice) ||
          i.unitPrice < 0 ||
          !Number.isInteger(i.quantity) ||
          i.quantity < 1,
      )
    ) {
      toast.error("商品名・単価・数量を正しく入力してください");
      return;
    }
    setSaving(true);
    try {
      await updateFn({
        data: {
          id: sale.id,
          soldAt: new Date(soldAt).toISOString(),
          note: note.trim() ? note.trim() : null,
          items,
        },
      });
      toast.success("会計を更新しました");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{label} を編集</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="sold-at">会計日時</Label>
            <Input
              id="sold-at"
              type="datetime-local"
              value={soldAt}
              onChange={(e) => setSoldAt(e.target.value)}
            />
            {sale.original_sold_at && (
              <div>
                <Hint>
                  初回登録:{" "}
                  {new Date(sale.original_sold_at).toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Hint>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={row.id ?? `new-${index}`} className="space-y-1 rounded-md border p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-32 flex-1 space-y-1">
                    <Label className="text-xs">商品名</Label>
                    <Input
                      value={row.name}
                      onChange={(e) => updateRow(index, { name: e.target.value })}
                      maxLength={60}
                    />
                    {row.originalName !== null && <Hint>初回: {row.originalName}</Hint>}
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">単価</Label>
                    <Input
                      type="number"
                      min={0}
                      value={row.unitPrice}
                      onChange={(e) => updateRow(index, { unitPrice: e.target.value })}
                    />
                    {row.originalUnitPrice !== null && <Hint>初回: ¥{row.originalUnitPrice}</Hint>}
                  </div>
                  <div className="w-20 space-y-1">
                    <Label className="text-xs">数量</Label>
                    <Input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => updateRow(index, { quantity: e.target.value })}
                    />
                    {row.originalQuantity !== null && <Hint>初回: {row.originalQuantity}</Hint>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                    disabled={rows.length === 1}
                    aria-label="この商品を削除"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setRows((prev) => [
                  ...prev,
                  {
                    id: null,
                    name: "",
                    unitPrice: "0",
                    quantity: "1",
                    originalName: null,
                    originalUnitPrice: null,
                    originalQuantity: null,
                  },
                ])
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              商品を追加
            </Button>
          </div>

          <div className="space-y-1">
            <Label htmlFor="note">メモ</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
            />
            {sale.original_note && <Hint>初回: {sale.original_note}</Hint>}
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-right">
            <div className="text-xl font-bold tabular-nums">¥{total.toLocaleString()}</div>
            {sale.original_total !== null && <Hint>初回登録: ¥{sale.original_total.toLocaleString()}</Hint>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
