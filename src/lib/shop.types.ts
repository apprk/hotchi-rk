export interface MenuItem {
  id: string;
  date: string;
  name: string;
  price: number;
  sort_order: number;
}

export interface SaleItem {
  id: string;
  name: string;
  unit_price: number;
  quantity: number;
  original_name: string | null;
  original_unit_price: number | null;
  original_quantity: number | null;
}

export interface Sale {
  id: string;
  date: string;
  sold_at: string;
  total: number;
  note: string | null;
  subtotal: number | null;
  discount_type: string | null;
  discount_value: number | null;
  discount_amount: number;
  original_sold_at: string | null;
  original_total: number | null;
  original_note: string | null;
  items: SaleItem[];
}

export interface DayTotal {
  date: string;
  total: number;
  count: number;
}

export interface NamedTotal {
  key: string;
  total: number;
  count: number;
}

export interface Analytics {
  years: number[];
  yearly: NamedTotal[];
  monthly: NamedTotal[];
  weekday: NamedTotal[];
  hourly: NamedTotal[];
  menus: NamedTotal[];
}
