import { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ArrowUpDown, RefreshCw } from 'lucide-react';
import { CustomerSortField, SortDirection } from '@/types/customer';
import { format, parseISO } from 'date-fns';

export function CustomersTab() {
  const { customers, loading, refetch } = useCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<CustomerSortField>('total_order_cost');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = customers;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (customer) =>
          customer.customer_name.toLowerCase().includes(query) ||
          customer.phone.includes(query) ||
          customer.customer_id.toLowerCase().includes(query)
      );
    }

    // Sort
    return [...filtered].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;

      if (sortField === 'customer_name') {
        return multiplier * a.customer_name.localeCompare(b.customer_name);
      }
      if (sortField === 'last_order_date') {
        const aDate = a.last_order_date ? new Date(a.last_order_date).getTime() : 0;
        const bDate = b.last_order_date ? new Date(b.last_order_date).getTime() : 0;
        return multiplier * (aDate - bDate);
      }
      return multiplier * (a[sortField] - b[sortField]);
    });
  }, [customers, searchQuery, sortField, sortDirection]);

  const toggleSort = (field: CustomerSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Customer Management</CardTitle>
          <CardDescription>View and manage all customers</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={sortField}
              onValueChange={(value) => setSortField(value as CustomerSortField)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer_name">Name</SelectItem>
                <SelectItem value="no_of_orders">Orders</SelectItem>
                <SelectItem value="total_order_cost">Total Spent</SelectItem>
                <SelectItem value="last_order_date">Last Order</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={refetch}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => toggleSort('customer_name')}
                        className="gap-1"
                      >
                        Customer Name
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => toggleSort('no_of_orders')}
                        className="gap-1"
                      >
                        Orders
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => toggleSort('total_order_cost')}
                        className="gap-1"
                      >
                        Total Spent
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => toggleSort('last_order_date')}
                        className="gap-1"
                      >
                        Last Order
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No customers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedCustomers.map((customer) => (
                      <TableRow key={customer.customer_id}>
                        <TableCell className="font-medium">{customer.customer_name}</TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell>{customer.no_of_orders}</TableCell>
                        <TableCell>${customer.total_order_cost.toFixed(2)}</TableCell>
                        <TableCell>
                          {customer.last_order_date
                            ? format(parseISO(customer.last_order_date), 'MMM dd, yyyy')
                            : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
