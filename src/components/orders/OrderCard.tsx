import { format, formatDistanceToNow } from 'date-fns';
import { Phone, User, Package, Clock, DollarSign } from 'lucide-react';
import { Order } from '@/types/order';
import { StatusBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OrderCardProps {
  order: Order;
  onAccept?: () => void;
  onReject?: () => void;
  onMarkReady?: () => void;
  onMarkReceived?: () => void;
  onClick?: () => void;
  isLoading?: boolean;
}

export function OrderCard({
  order,
  onAccept,
  onReject,
  onMarkReady,
  onMarkReceived,
  onClick,
  isLoading,
}: OrderCardProps) {
  const totalPrice = order.order_items?.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  ) || 0;

  const itemsCount = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const isReady = order.status === 'ready';

  return (
    <div
      className={cn(
        'order-card p-5 cursor-pointer animate-fade-in',
        isReady && 'pulse-ready border-status-ready'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground text-lg">{order.order_id}</h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDistanceToNow(new Date(order.new_order_at), { addSuffix: true })}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="space-y-2.5 mb-4">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{order.customer_name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>{order.phone_number}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          <span>{itemsCount} item{itemsCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span>${totalPrice.toFixed(2)}</span>
        </div>
      </div>

      {order.order_items && order.order_items.length > 0 && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-2">Items</p>
          <div className="space-y-1">
            {order.order_items.slice(0, 3).map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-foreground">
                  {item.quantity}x {item.item}
                </span>
                <span className="text-muted-foreground">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            {order.order_items.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{order.order_items.length - 3} more items
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        {onAccept && (
          <Button
            onClick={onAccept}
            disabled={isLoading}
            className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
          >
            Accept
          </Button>
        )}
        {onReject && (
          <Button
            onClick={onReject}
            disabled={isLoading}
            variant="destructive"
            className="flex-1"
          >
            Reject
          </Button>
        )}
        {onMarkReady && (
          <Button
            onClick={onMarkReady}
            disabled={isLoading}
            className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
          >
            Mark Ready
          </Button>
        )}
        {onMarkReceived && (
          <Button
            onClick={onMarkReceived}
            disabled={isLoading}
            className="flex-1"
          >
            Mark Received
          </Button>
        )}
      </div>
    </div>
  );
}
