import { useState, useMemo } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useCustomers } from '@/hooks/useCustomers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Users, TrendingUp, RefreshCw, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { parseISO, isSameDay, isAfter, isBefore } from 'date-fns';
import { CustomerSegmentChart } from './charts/CustomerSegmentChart';

export function CustomerInsightsTab() {
  const { topCustomers, loading: analyticsLoading } = useAnalytics();
  const { customers, loading: customersLoading } = useCustomers();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const loading = analyticsLoading || customersLoading;

  // Filter customers by join date
  const filteredCustomers = useMemo(() => {
    if (!dateRange?.from) return customers;

    const fromDate = dateRange.from;
    const toDate = dateRange.to || dateRange.from;

    return customers.filter(customer => {
      const createdAt = parseISO(customer.created_at);

      // Inclusive date comparison
      if (isSameDay(createdAt, fromDate) || isSameDay(createdAt, toDate)) return true;
      if (isAfter(createdAt, fromDate) && isBefore(createdAt, toDate)) return true;

      return false;
    });
  }, [customers, dateRange]);

  // Segment customers by order frequency
  const customerSegments = useMemo(() => {
    const oneTimeBuyers = filteredCustomers.filter(c => c.no_of_orders === 1);
    const occasionalBuyers = filteredCustomers.filter(c => c.no_of_orders >= 2 && c.no_of_orders <= 5);
    const regularBuyers = filteredCustomers.filter(c => c.no_of_orders >= 6 && c.no_of_orders <= 10);
    const vipBuyers = filteredCustomers.filter(c => c.no_of_orders > 10);

    const total = filteredCustomers.length || 1; // Avoid division by zero

    return {
      oneTime: { count: oneTimeBuyers.length, percentage: (oneTimeBuyers.length / total) * 100 },
      occasional: { count: occasionalBuyers.length, percentage: (occasionalBuyers.length / total) * 100 },
      regular: { count: regularBuyers.length, percentage: (regularBuyers.length / total) * 100 },
      vip: { count: vipBuyers.length, percentage: (vipBuyers.length / total) * 100 },
    };
  }, [filteredCustomers]);

  // Filter top customers by date range
  const filteredTopCustomers = useMemo(() => {
    if (!dateRange?.from) return topCustomers;

    return topCustomers.filter(customer => {
      const matchingCustomer = filteredCustomers.find(c => c.customer_id === customer.customer_id);
      return !!matchingCustomer;
    });
  }, [topCustomers, filteredCustomers, dateRange]);

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

      {/* Customer Segments */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">One-Time Buyers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerSegments.oneTime.count}</div>
            <p className="text-xs text-muted-foreground">
              {customerSegments.oneTime.percentage.toFixed(1)}% of customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occasional (2-5)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerSegments.occasional.count}</div>
            <p className="text-xs text-muted-foreground">
              {customerSegments.occasional.percentage.toFixed(1)}% of customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regular (6-10)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerSegments.regular.count}</div>
            <p className="text-xs text-muted-foreground">
              {customerSegments.regular.percentage.toFixed(1)}% of customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP (10+)</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerSegments.vip.count}</div>
            <p className="text-xs text-muted-foreground">
              {customerSegments.vip.percentage.toFixed(1)}% of customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
          <CardDescription>Highest spending customers by lifetime value</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Rank</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Avg Order Value</TableHead>
                  <TableHead>Segment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTopCustomers.map((customer) => {
                  const avgOrderValue = customer.total_order_cost / customer.no_of_orders;
                  const segment =
                    customer.no_of_orders > 10 ? 'VIP' :
                    customer.no_of_orders >= 6 ? 'Regular' :
                    customer.no_of_orders >= 2 ? 'Occasional' : 'One-Time';

                  return (
                    <TableRow key={customer.customer_id}>
                      <TableCell className="font-medium">
                        {customer.rank <= 3 ? (
                          <Trophy className={`h-4 w-4 ${
                            customer.rank === 1 ? 'text-yellow-500' :
                            customer.rank === 2 ? 'text-gray-400' :
                            'text-amber-700'
                          }`} />
                        ) : (
                          customer.rank
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{customer.customer_name}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{customer.no_of_orders}</TableCell>
                      <TableCell>${customer.total_order_cost.toFixed(2)}</TableCell>
                      <TableCell>${avgOrderValue.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          segment === 'VIP' ? 'default' :
                          segment === 'Regular' ? 'secondary' :
                          'outline'
                        }>
                          {segment}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Segment Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Distribution</CardTitle>
          <CardDescription>Breakdown by purchase frequency</CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerSegmentChart segments={customerSegments} />
        </CardContent>
      </Card>
    </div>
  );
}
