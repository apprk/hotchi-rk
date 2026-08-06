import logoAsset from "@/assets/hotchi-logo.jpg.asset.json";
import { cn } from "@/lib/utils";

export function ShopLogo({ className, alt = "まちの小さな惣菜屋 ほっち" }: { className?: string; alt?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt={alt}
      className={cn("select-none object-contain mix-blend-multiply dark:mix-blend-normal", className)}
      draggable={false}
    />
  );
}