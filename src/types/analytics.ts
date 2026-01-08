import { DailySalesData } from './sales';

export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  avgOrderValue: number;
  revenueToday: number;
  ordersToday: number;
  newCustomersToday: number;
}

export interface RevenueChartData extends DailySalesData {
  label: string;
}

export interface TopCustomer {
  customer_id: string;
  customer_name: string;
  phone: string;
  total_order_cost: number;
  no_of_orders: number;
  rank: number;
}
