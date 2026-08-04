import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
}

interface MonthlyChartProps {
  data: MonthlySummary[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>月別収支</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 text-muted-foreground">
            データがないため、グラフを表示できません。
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    label: `${item.month.slice(0, 4)}年${item.month.slice(5)}月`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>月別収支</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => `¥${value.toLocaleString()}`}
                labelStyle={{ fontSize: 12 }}
              />
              <Legend />
              <Bar dataKey="income" name="売上" fill="oklch(0.6 0.18 150)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="支出" fill="oklch(0.65 0.18 25)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
