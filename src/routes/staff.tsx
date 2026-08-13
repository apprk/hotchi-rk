import { createFileRoute, Link } from "@tanstack/react-router";
import { ChartColumn, Settings } from "lucide-react";

import { AppNav } from "@/components/shop/AppNav";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "スタッフ管理 | mnmrk" },
      {
        name: "description",
        content: "売上分析や店舗設定など、スタッフ向けの管理メニューをまとめた画面です。",
      },
      { property: "og:title", content: "スタッフ管理 | mnmrk" },
      { property: "og:description", content: "分析と設定をまとめたスタッフ用メニュー。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StaffPage,
});

const items = [
  { to: "/analytics", label: "分析", description: "売上・来店・客単価の分析", icon: ChartColumn },
  { to: "/settings", label: "設定", description: "店舗情報・税率・データ管理", icon: Settings },
] as const;

function StaffPage() {
  return (
    <div className="min-h-screen bg-background pb-16">
      <AppNav />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight">スタッフ</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map(({ to, label, description, icon: Icon }) => (
            <Link key={to} to={to}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="flex items-center gap-4 p-6">
                  <Icon className="h-8 w-8 text-primary" />
                  <div>
                    <div className="text-lg font-semibold">{label}</div>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}