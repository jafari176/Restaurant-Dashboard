export interface Sale {
  id: string;
  order_id: string;
  sub_total: number;
  including_tax: number;
  date: string;
  created_at: string;
}

export interface DailySalesData {
  date: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
}

export type SalesPeriod = 'daily' | 'weekly' | 'monthly';
