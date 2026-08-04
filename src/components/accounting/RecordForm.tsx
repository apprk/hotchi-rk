import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface RecordFormProps {
  onSubmit: (data: {
    date: string;
    type: "income" | "expense";
    category: string;
    amount: number;
    note: string | null;
  }) => void;
  isSubmitting: boolean;
}

export function RecordForm({ onSubmit, isSubmitting }: RecordFormProps) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [type, setType] = useState<"income" | "expense">("income");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0 || !Number.isInteger(amountNumber)) {
      setError("金額は1円以上の整数を入力してください");
      return;
    }
    if (category.trim().length === 0) {
      setError("分類を入力してください");
      return;
    }

    onSubmit({
      date,
      type,
      category: category.trim(),
      amount: amountNumber,
      note: note.trim() || null,
    });

    setAmount("");
    setNote("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="date">日付</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">種類</Label>
        <Select value={type} onValueChange={(value) => setType(value as "income" | "expense")}>
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="income">売上</SelectItem>
            <SelectItem value="expense">支出</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">分類</Label>
        <Input
          id="category"
          placeholder="例：お弁当、仕入れ、雑費"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          maxLength={50}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">金額（円）</Label>
        <Input
          id="amount"
          type="number"
          min={1}
          step={1}
          placeholder="1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">メモ</Label>
        <Textarea
          id="note"
          placeholder="必要に応じてメモを入力"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "保存中..." : "記録を追加"}
      </Button>
    </form>
  );
}
