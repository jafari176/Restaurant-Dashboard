import { Order } from '@/types/order';
import { OrderCard } from './OrderCard';
import { Package } from 'lucide-react';

interface OrderGridProps {
  orders: Order[];
  emptyMessage: string;
  onOrderClick: (order: Order) => void;
  onAccept?: (order: Order) => void;
  onReject?: (order: Order) => void;
  onMarkReady?: (order: Order) => void;
  onMarkReceived?: (order: Order) => void;
  isLoading?: boolean;
}

export function OrderGrid({
  orders,
  emptyMessage,
  onOrderClick,
  onAccept,
  onReject,
  onMarkReady,
  onMarkReceived,
  isLoading,
}: OrderGridProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg text-foreground mb-1">No orders</h3>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {orders.map((order) => (
        <OrderCard
          key={order.order_id}
          order={order}
          onClick={() => onOrderClick(order)}
          onAccept={onAccept ? () => onAccept(order) : undefined}
          onReject={onReject ? () => onReject(order) : undefined}
          onMarkReady={onMarkReady ? () => onMarkReady(order) : undefined}
          onMarkReceived={onMarkReceived ? () => onMarkReceived(order) : undefined}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
