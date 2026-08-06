import { Link } from "@tanstack/react-router";
import { Calculator, CalendarDays, ChartColumn, Settings, UtensilsCrossed } from "lucide-react";
import { ShopLogo } from "@/components/shop/ShopLogo";

const links = [
  { to: "/", label: "レジ", icon: Calculator },
  { to: "/menu", label: "メニュー", icon: UtensilsCrossed },
  { to: "/history", label: "履歴", icon: CalendarDays },
  { to: "/analytics", label: "分析", icon: ChartColumn },
  { to: "/settings", label: "設定", icon: Settings },
] as const;

export function AppNav() {
  return (
    <nav className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-1 px-2 py-2 sm:px-4">
        <ShopLogo className="mr-1 hidden h-9 w-9 shrink-0 sm:block" />
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex flex-1 flex-col items-center gap-1 rounded-md px-2 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent data-[status=active]:bg-primary/10 data-[status=active]:text-primary sm:flex-row sm:justify-center sm:text-sm"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}