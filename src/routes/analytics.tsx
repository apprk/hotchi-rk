import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppNav } from "@/components/shop/AppNav";
import { analytics } from "@/lib/shop.functions";
import { taxBreakdown, useSettings, yen } from "@/lib/settings";
import type { NamedTotal } from "@/lib/shop.types";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "売上分析 | mnmrk" },
      {
        name: "description",
        content: "月ごとの売上推移、曜日別・時間帯別の比較、メニュー別の売上ランキングを確認できます。",
      },
      { property: "og:title", content: "売上分析 | mnmrk" },
      {
        property: "og:description",
        content: "月別推移・曜日別・時間帯別・メニュー別に売上を比較できます。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

type Metric = "sales" | "visits" | "average";

const METRICS: { value: Metric; label: string; unit: string }[] = [
  { value: "sales", label: "売上分析", unit: "円" },
  { value: "visits", label: "来店分析", unit: "組" },
  { value: "average", label: "客単価分析", unit: "円" },
];

function metricValue(entry: NamedTotal, metric: Metric) {
  if (metric === "visits") return entry.count;
  if (metric === "average") return entry.count === 0 ? 0 : Math.round(entry.total / entry.count);
  return entry.total;
}

function formatMetric(value: number, metric: Metric) {
  return metric === "visits" ? `${value.toLocaleString()}組` : yen(value);
}

function ChartCard({
  title,
  data,
  type,
  metric,
}: {
  title: string;
  data: NamedTotal[];
  type: "line" | "bar";
  metric: Metric;
}) {
  const chartData = data.map((d) => ({ key: d.key, value: metricValue(d, metric) }));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">データがまだありません。</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {type === "line" ? (
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="key" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatMetric(v, metric)} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={METRICS.find((m) => m.value === metric)?.label ?? ""}
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                  />
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="key" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatMetric(v, metric)} />
                  <Bar
                    dataKey="value"
                    name={METRICS.find((m) => m.value === metric)?.label ?? ""}
                    fill="var(--color-primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsPage() {
  const [year, setYear] = useState<number | null>(new Date().getFullYear());
  const [metric, setMetric] = useState<Metric>("sales");
  const settings = useSettings();
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", year],
    queryFn: () => analytics({ data: { year } }),
  });

  const years = data?.years ?? [];
  const options: { label: string; value: number | null }[] = [
    { label: "全期間", value: null },
    ...years.map((y) => ({ label: `${y}年`, value: y as number | null })),
  ];

  const grossTotal = (data?.monthly ?? []).reduce((s, m) => s + m.total, 0);
  const visits = (data?.monthly ?? []).reduce((s, m) => s + m.count, 0);
  const tax = taxBreakdown(grossTotal, settings.taxRate);

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight">売上分析</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">分析年</span>
          {options.map((o) => (
            <Button
              key={o.label}
              size="sm"
              variant={year === o.value ? "default" : "outline"}
              onClick={() => setYear(o.value)}
            >
              {o.label}
            </Button>
          ))}
        </div>

        <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <TabsList className="w-full">
            {METRICS.map((m) => (
              <TabsTrigger key={m.value} value={m.value} className="flex-1">
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading || !data ? (
          <p className="text-muted-foreground">読み込み中...</p>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">合計（税率 {settings.taxRate}%）</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Stat label="税込金額" value={yen(tax.gross)} />
                <Stat label="税抜金額" value={yen(tax.net)} />
                <Stat label="消費税額" value={yen(tax.tax)} />
                <Stat
                  label="組数 / 客単価"
                  value={`${visits.toLocaleString()}組 / ${yen(visits ? Math.round(grossTotal / visits) : 0)}`}
                />
              </CardContent>
            </Card>
            <ChartCard title="年別" data={data.yearly} type="bar" metric={metric} />
            <ChartCard title="月別" data={data.monthly} type="line" metric={metric} />
            <ChartCard title="曜日別" data={data.weekday} type="bar" metric={metric} />
            <ChartCard title="時間帯別（30分単位）" data={data.hourly} type="bar" metric={metric} />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">メニュー別 売上ランキング</CardTitle>
              </CardHeader>
              <CardContent>
                {data.menus.length === 0 ? (
                  <p className="text-sm text-muted-foreground">データがまだありません。</p>
                ) : (
                  <ul className="divide-y">
                    {data.menus.map((m, index) => (
                      <li key={m.key} className="flex items-center justify-between py-2 text-sm">
                        <span>
                          <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                          {m.key}
                        </span>
                        <span className="text-right">
                          <span className="font-medium tabular-nums">{yen(m.total)}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{m.count}個</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}