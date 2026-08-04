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
}

export interface Sale {
  id: string;
  date: string;
  sold_at: string;
  total: number;
  note: string | null;
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
  monthly: NamedTotal[];
  weekday: NamedTotal[];
  hourly: NamedTotal[];
  menus: NamedTotal[];
}