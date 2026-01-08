import { useMemo } from 'react';
import { useOrders } from './useOrders';
import { useCustomers } from './useCustomers';
import { useSales } from './useSales';
import { AnalyticsSummary, RevenueChartData, TopCustomer } from '@/types/analytics';
import { startOfDay, subDays, format, isWithinInterval, parseISO } from 'date-fns';

export function useAnalytics() {
  const { orders, loading: ordersLoading } = useOrders();
  const { customers, loading: customersLoading } = useCustomers();
  const { sales, loading: salesLoading } = useSales();

  const loading = ordersLoading || customersLoading || salesLoading;

  // Calculate summary metrics
  const summary: AnalyticsSummary = useMemo(() => {
    const today = startOfDay(new Date());

    // Calculate total revenue from sales table
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.including_tax, 0);
    const totalOrders = sales.length;
    const totalCustomers = customers.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate today's metrics from sales table
    const revenueToday = sales
      .filter(sale => parseISO(sale.date) >= today)
      .reduce((sum, sale) => sum + sale.including_tax, 0);

    const ordersToday = sales.filter(sale => parseISO(sale.date) >= today).length;

    // Calculate new customers today
    const newCustomersToday = customers.filter(
      customer => parseISO(customer.created_at) >= today
    ).length;

    return {
      totalRevenue,
      totalOrders,
      totalCustomers,
      avgOrderValue,
      revenueToday,
      ordersToday,
      newCustomersToday,
    };
  }, [sales, customers]);

  // Generate revenue chart data for last 30 days
  const revenueChartData: RevenueChartData[] = useMemo(() => {
    const days = 30;
    const data: RevenueChartData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStart = startOfDay(date);
      const dateEnd = startOfDay(subDays(new Date(), i - 1));

      const daySales = sales.filter(sale => {
        const saleDate = parseISO(sale.date);
        return isWithinInterval(saleDate, { start: dateStart, end: dateEnd });
      });

      const revenue = daySales.reduce((sum, sale) => sum + sale.including_tax, 0);
      const ordersCount = daySales.length;

      data.push({
        date: format(date, 'yyyy-MM-dd'),
        label: format(date, 'MMM dd'),
        revenue,
        orders: ordersCount,
        avgOrderValue: ordersCount > 0 ? revenue / ordersCount : 0,
      });
    }

    return data;
  }, [sales]);

  // Get top customers
  const topCustomers: TopCustomer[] = useMemo(() => {
    return customers
      .sort((a, b) => b.total_order_cost - a.total_order_cost)
      .slice(0, 10)
      .map((customer, index) => ({
        customer_id: customer.customer_id,
        customer_name: customer.customer_name,
        phone: customer.phone,
        total_order_cost: customer.total_order_cost,
        no_of_orders: customer.no_of_orders,
        rank: index + 1,
      }));
  }, [customers]);

  return {
    summary,
    revenueChartData,
    topCustomers,
    loading,
  };
}
