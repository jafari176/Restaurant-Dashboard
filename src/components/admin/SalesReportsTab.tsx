import { useState, useMemo } from 'react';
import { useSales } from '@/hooks/useSales';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SalesPeriod, DailySalesData } from '@/types/sales';
import { DailyRevenueChart } from './charts/DailyRevenueChart';
import { WeeklyRevenueChart } from './charts/WeeklyRevenueChart';
import { MonthlyRevenueChart } from './charts/MonthlyRevenueChart';
import { RefreshCw, DollarSign, ShoppingCart, TrendingUp, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  subDays,
  subWeeks,
  subMonths,
  format,
  parseISO,
  isWithinInterval,
  isSameDay,
  isAfter,
  isBefore
} from 'date-fns';

export function SalesReportsTab() {
  const { sales, loading, refetch } = useSales();
  const [period, setPeriod] = useState<SalesPeriod>('daily');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const dailyData = useMemo(() => {
    const days = 30;
    const data: DailySalesData[] = [];

    // Apply custom date range if selected
    const filteredSales = dateRange?.from ? sales.filter(sale => {
      const saleDate = parseISO(sale.date);
      const fromDate = dateRange.from!;
      const toDate = dateRange.to || dateRange.from!;

      // Inclusive date comparison
      if (isSameDay(saleDate, fromDate) || isSameDay(saleDate, toDate)) return true;
      if (isAfter(saleDate, fromDate) && isBefore(saleDate, toDate)) return true;

      return false;
    }) : sales;

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStart = startOfDay(date);
      const dateEnd = startOfDay(subDays(new Date(), i - 1));

      const daySales = filteredSales.filter(sale => {
        const saleDate = parseISO(sale.date);
        return isWithinInterval(saleDate, { start: dateStart, end: dateEnd });
      });

      const revenue = daySales.reduce((sum, sale) => sum + sale.including_tax, 0);
      const orders = daySales.length;

      data.push({
        date: format(date, 'yyyy-MM-dd'),
        revenue,
        orders,
        avgOrderValue: orders > 0 ? revenue / orders : 0,
      });
    }

    return data;
  }, [sales, dateRange]);

  const weeklyData = useMemo(() => {
    const weeks = 12;
    const data: DailySalesData[] = [];

    // Apply custom date range if selected
    const filteredSales = dateRange?.from ? sales.filter(sale => {
      const saleDate = parseISO(sale.date);
      const fromDate = dateRange.from!;
      const toDate = dateRange.to || dateRange.from!;

      // Inclusive date comparison
      if (isSameDay(saleDate, fromDate) || isSameDay(saleDate, toDate)) return true;
      if (isAfter(saleDate, fromDate) && isBefore(saleDate, toDate)) return true;

      return false;
    }) : sales;

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i));
      const weekEnd = startOfWeek(subWeeks(new Date(), i - 1));

      const weekSales = filteredSales.filter(sale => {
        const saleDate = parseISO(sale.date);
        return isWithinInterval(saleDate, { start: weekStart, end: weekEnd });
      });

      const revenue = weekSales.reduce((sum, sale) => sum + sale.including_tax, 0);
      const orders = weekSales.length;

      data.push({
        date: format(weekStart, 'yyyy-MM-dd'),
        revenue,
        orders,
        avgOrderValue: orders > 0 ? revenue / orders : 0,
      });
    }

    return data;
  }, [sales, dateRange]);

  const monthlyData = useMemo(() => {
    const months = 12;
    const data: DailySalesData[] = [];

    // Apply custom date range if selected
    const filteredSales = dateRange?.from ? sales.filter(sale => {
      const saleDate = parseISO(sale.date);
      const fromDate = dateRange.from!;
      const toDate = dateRange.to || dateRange.from!;

      // Inclusive date comparison
      if (isSameDay(saleDate, fromDate) || isSameDay(saleDate, toDate)) return true;
      if (isAfter(saleDate, fromDate) && isBefore(saleDate, toDate)) return true;

      return false;
    }) : sales;

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = startOfMonth(subMonths(new Date(), i - 1));

      const monthSales = filteredSales.filter(sale => {
        const saleDate = parseISO(sale.date);
        return isWithinInterval(saleDate, { start: monthStart, end: monthEnd });
      });

      const revenue = monthSales.reduce((sum, sale) => sum + sale.including_tax, 0);
      const orders = monthSales.length;

      data.push({
        date: format(monthStart, 'yyyy-MM-dd'),
        revenue,
        orders,
        avgOrderValue: orders > 0 ? revenue / orders : 0,
      });
    }

    return data;
  }, [sales, dateRange]);

  const currentPeriodData = period === 'daily' ? dailyData : period === 'weekly' ? weeklyData : monthlyData;
  const totalRevenue = currentPeriodData.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = currentPeriodData.reduce((sum, d) => sum + d.orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <div className="flex items-center gap-2">
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
        {dateRange && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDateRange(undefined)}
            title="Clear date filter"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Period Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {period === 'daily' ? 'Last 30 days' : period === 'weekly' ? 'Last 12 weeks' : 'Last 12 months'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Period Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Total completed orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Per order in period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sales Breakdown</CardTitle>
              <CardDescription>Revenue analysis by time period</CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={refetch}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={period} onValueChange={(value) => setPeriod(value as SalesPeriod)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="mt-6">
              <DailyRevenueChart data={dailyData} />
            </TabsContent>

            <TabsContent value="weekly" className="mt-6">
              <WeeklyRevenueChart data={weeklyData} />
            </TabsContent>

            <TabsContent value="monthly" className="mt-6">
              <MonthlyRevenueChart data={monthlyData} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
