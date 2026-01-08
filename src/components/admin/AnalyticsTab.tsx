import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAnalytics } from '@/hooks/useAnalytics';
import { DollarSign, ShoppingCart, Users, TrendingUp, RefreshCw, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { parseISO, isSameDay, isAfter, isBefore } from 'date-fns';
import { RevenueChart } from './charts/RevenueChart';
import { OrdersChart } from './charts/OrdersChart';

export function AnalyticsTab() {
  const { summary, revenueChartData, loading } = useAnalytics();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // First, filter chart data
  const filteredChartData = useMemo(() => {
    if (!dateRange?.from) return revenueChartData;

    const fromDate = dateRange.from;
    const toDate = dateRange.to || dateRange.from;

    return revenueChartData.filter(data => {
      const dataDate = parseISO(data.date);

      // Inclusive date comparison
      if (isSameDay(dataDate, fromDate) || isSameDay(dataDate, toDate)) return true;
      if (isAfter(dataDate, fromDate) && isBefore(dataDate, toDate)) return true;

      return false;
    });
  }, [revenueChartData, dateRange]);

  // Then, calculate filtered summary from the filtered chart data
  const filteredSummary = useMemo(() => {
    if (!dateRange?.from) return summary;

    // Calculate metrics from filtered chart data
    const totalRevenue = filteredChartData.reduce((sum, data) => sum + data.revenue, 0);
    const totalOrders = filteredChartData.reduce((sum, data) => sum + data.orders, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // For filtered view, we can't accurately calculate "today" metrics, so we'll show 0
    return {
      totalRevenue,
      totalOrders,
      totalCustomers: summary.totalCustomers, // Keep original as we can't filter customers by order date
      avgOrderValue,
      revenueToday: 0,
      ordersToday: 0,
      newCustomersToday: 0,
    };
  }, [summary, dateRange, filteredChartData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${filteredSummary.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${filteredSummary.revenueToday.toFixed(2)} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSummary.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {filteredSummary.ordersToday} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSummary.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {filteredSummary.newCustomersToday} new today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${filteredSummary.avgOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Per completed order
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Last 30 days revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={filteredChartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders Trend</CardTitle>
            <CardDescription>Last 30 days order volume</CardDescription>
          </CardHeader>
          <CardContent>
            <OrdersChart data={filteredChartData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
