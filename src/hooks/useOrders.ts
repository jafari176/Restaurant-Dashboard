import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderItem, OrderStatus } from '@/types/order';
import { useToast } from '@/hooks/use-toast';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('new_order_at', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*');

      if (itemsError) throw itemsError;

      const ordersWithItems = (ordersData || []).map(order => ({
        ...order,
        order_items: (itemsData || []).filter(item => item.order_id === order.order_id) as OrderItem[],
      })) as Order[];

      setOrders(ordersWithItems);
      setLastRefreshedAt(new Date());
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateOrderStatus = async (
    orderId: string,
    newStatus: OrderStatus,
    additionalFields: Partial<Order> = {}
  ) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, ...additionalFields })
        .eq('order_id', orderId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Order ${orderId} updated to ${newStatus.replace('_', ' ')}`,
      });

      return true;
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('order_id', orderId);

      if (error) throw error;

      toast({
        title: 'Order Rejected',
        description: `Order ${orderId} has been removed`,
      });

      return true;
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject order',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchOrders();

    // Auto-refresh every 30 seconds
    const intervalId = setInterval(() => {
      fetchOrders();
    }, 30000);

    const ordersChannel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    const itemsChannel = supabase
      .channel('items-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [fetchOrders]);

  const ordersByStatus = {
    new: orders.filter(o => o.status === 'new'),
    in_progress: orders.filter(o => o.status === 'in_progress'),
    ready: orders.filter(o => o.status === 'ready'),
    received: orders.filter(o => o.status === 'received'),
  };

  return {
    orders,
    ordersByStatus,
    loading,
    lastRefreshedAt,
    updateOrderStatus,
    deleteOrder,
    refetch: fetchOrders,
  };
}
