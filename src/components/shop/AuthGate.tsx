import { useEffect, useState, type ReactNode } from "react";
import { Delete } from "lucide-react";

import { ShopLogo } from "@/components/shop/ShopLogo";
import { AUTH_DAYS, AUTH_KEY, readSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

function isUnlocked() {
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    return Number(raw) > Date.now();
  } catch {
    return false;
  }
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [showPad, setShowPad] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const settings = readSettings();
    setUnlocked(!settings.authEnabled || isUnlocked());
    setReady(true);
  }, []);

  useEffect(() => {
    if (pin.length !== 4) return;
    const settings = readSettings();
    if (pin === settings.password) {
      window.localStorage.setItem(
        AUTH_KEY,
        String(Date.now() + AUTH_DAYS * 24 * 60 * 60 * 1000),
      );
      setUnlocked(true);
    } else {
      setError(true);
      setTimeout(() => {
        setPin("");
        setError(false);
      }, 600);
    }
  }, [pin]);

  if (!ready) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_20%,color-mix(in_oklab,var(--color-primary)_12%,var(--color-background)),var(--color-background)_70%)] px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <button
          type="button"
          onClick={() => setShowPad(true)}
          className={cn(
            "group mx-auto block rounded-[2rem] bg-card p-6 shadow-[0_20px_60px_-25px_color-mix(in_oklab,var(--color-primary)_60%,transparent)] transition-transform duration-300",
            showPad ? "scale-90" : "hover:scale-[1.03] active:scale-95",
          )}
          aria-label="パスワード入力を開く"
        >
          <ShopLogo className="mx-auto h-48 w-48 sm:h-56 sm:w-56" />
        </button>

        {!showPad ? (
          <p className="mt-8 animate-pulse text-sm tracking-[0.3em] text-muted-foreground">
            ロゴをタップして開店
          </p>
        ) : (
          <div className="mt-8">
            <p className={cn("text-sm", error ? "text-destructive" : "text-muted-foreground")}>
              {error ? "パスワードが違います" : "4桁のパスワードを入力"}
            </p>
            <div className={cn("mt-4 flex justify-center gap-3", error && "animate-bounce")}>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-4 w-4 rounded-full border-2 border-primary/50 transition-colors",
                    pin.length > i && "bg-primary",
                  )}
                />
              ))}
            </div>
            <div className="mx-auto mt-8 grid max-w-[17rem] grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                <PadKey key={n} onClick={() => setPin((p) => (p.length < 4 ? p + n : p))}>
                  {n}
                </PadKey>
              ))}
              <div />
              <PadKey onClick={() => setPin((p) => (p.length < 4 ? p + "0" : p))}>0</PadKey>
              <PadKey onClick={() => setPin((p) => p.slice(0, -1))} aria-label="1文字消す">
                <Delete className="mx-auto h-5 w-5" />
              </PadKey>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PadKey({
  children,
  onClick,
  ...rest
}: {
  children: ReactNode;
  onClick: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border bg-card py-4 text-2xl font-semibold tabular-nums shadow-sm transition-colors hover:bg-accent active:bg-primary/10"
      {...rest}
    >
      {children}
    </button>
  );
}