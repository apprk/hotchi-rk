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
import { AppNav } from "@/components/shop/AppNav";
import { analytics } from "@/lib/shop.functions";
import type { NamedTotal } from "@/lib/shop.types";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "売上分析 | 総菜屋の売上台帳" },
      {
        name: "description",
        content: "月ごとの売上推移、曜日別・時間帯別の比較、メニュー別の売上ランキングを確認できます。",
      },
      { property: "og:title", content: "売上分析 | 総菜屋の売上台帳" },
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

function yen(value: number) {
  return `¥${value.toLocaleString()}`;
}

function ChartCard({
  title,
  data,
  type,
}: {
  title: string;
  data: NamedTotal[];
  type: "line" | "bar";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">データがまだありません。</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {type === "line" ? (
                <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="key" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => yen(v)} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="売上"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                  />
                </LineChart>
              ) : (
                <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="key" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => yen(v)} />
                  <Bar dataKey="total" name="売上" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
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
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", year],
    queryFn: () => analytics({ data: { year } }),
  });

  const years = data?.years ?? [];
  const options: { label: string; value: number | null }[] = [
    ...years.map((y) => ({ label: `${y}年`, value: y as number | null })),
    { label: "全期間", value: null },
  ];

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
        {isLoading || !data ? (
          <p className="text-muted-foreground">読み込み中...</p>
        ) : (
          <>
            <ChartCard title="月別の売上推移" data={data.monthly} type="line" />
            <ChartCard title="曜日別の売上" data={data.weekday} type="bar" />
            <ChartCard title="時間帯別の売上（30分単位）" data={data.hourly} type="bar" />
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