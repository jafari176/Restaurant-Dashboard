export interface Customer {
  customer_id: string;
  customer_name: string;
  phone: string;
  last_order_date: string | null;
  no_of_orders: number;
  total_order_cost: number;
  created_at: string;
}

export type CustomerSortField = 'customer_name' | 'no_of_orders' | 'total_order_cost' | 'last_order_date';
export type SortDirection = 'asc' | 'desc';
