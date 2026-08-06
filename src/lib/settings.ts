import { useEffect, useState } from "react";

export const APP_VERSION = "1.2.0";

export interface AppSettings {
  shopName: string;
  phone: string;
  taxRate: number;
  password: string;
  authEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  shopName: "まちの小さな惣菜屋 ほっち",
  phone: "",
  taxRate: 8,
  password: "0000",
  authEnabled: true,
};

const SETTINGS_KEY = "hotchi.settings.v1";
export const AUTH_KEY = "hotchi.auth.v1";
export const AUTH_DAYS = 30;

const listeners = new Set<(s: AppSettings) => void>();

export function readSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(next: Partial<AppSettings>) {
  const merged = { ...readSettings(), ...next };
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  listeners.forEach((fn) => fn(merged));
  return merged;
}

export function resetSettings() {
  window.localStorage.removeItem(SETTINGS_KEY);
  window.localStorage.removeItem(AUTH_KEY);
  listeners.forEach((fn) => fn(DEFAULT_SETTINGS));
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(readSettings());
    const fn = (s: AppSettings) => setSettings(s);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  return settings;
}

/** total は税込金額。税抜と消費税額を算出する。 */
export function taxBreakdown(totalIncludingTax: number, taxRate: number) {
  const net = Math.round(totalIncludingTax / (1 + taxRate / 100));
  return { net, tax: totalIncludingTax - net, gross: totalIncludingTax };
}

export function yen(value: number) {
  return `¥${Math.round(value).toLocaleString()}`;
}