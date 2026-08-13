import { Link } from "@tanstack/react-router";
import { Calculator, CalendarDays, UserCog, UtensilsCrossed } from "lucide-react";
import { ShopLogo } from "@/components/shop/ShopLogo";

const links = [
  { to: "/", label: "レジ", icon: Calculator },
  { to: "/menu", label: "メニュー", icon: UtensilsCrossed },
  { to: "/history", label: "履歴", icon: CalendarDays },
  { to: "/staff", label: "スタッフ", icon: UserCog },
] as const;

export function AppNav() {
  return (
    <nav className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
        <ShopLogo className="mr-1 hidden h-11 w-11 shrink-0 sm:block" />
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex flex-1 flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent data-[status=active]:bg-primary/10 data-[status=active]:text-primary sm:flex-row sm:justify-center sm:gap-2 sm:py-3.5 sm:text-base"
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}