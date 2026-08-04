import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface RecordListProps {
  records: Tables<"account_records">[];
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function RecordList({ records, onDelete, isDeleting }: RecordListProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        まだ記録がありません。上のフォームから追加してください。
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>日付</TableHead>
            <TableHead>種類</TableHead>
            <TableHead>分類</TableHead>
            <TableHead className="text-right">金額</TableHead>
            <TableHead className="hidden sm:table-cell">メモ</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="whitespace-nowrap">{record.date}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    record.type === "income"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {record.type === "income" ? "売上" : "支出"}
                </span>
              </TableCell>
              <TableCell>{record.category}</TableCell>
              <TableCell className="text-right">
                <span
                  className={record.type === "income" ? "text-emerald-600" : "text-rose-600"}
                >
                  ¥{record.amount.toLocaleString()}
                </span>
              </TableCell>
              <TableCell className="hidden max-w-xs truncate sm:table-cell">
                {record.note ?? "—"}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(record.id)}
                  disabled={isDeleting}
                  aria-label="削除"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
