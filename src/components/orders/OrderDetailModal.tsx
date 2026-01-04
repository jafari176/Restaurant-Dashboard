import { format, formatDistanceToNow } from 'date-fns';
import { Phone, User, Clock, Package, DollarSign, Hash, CheckCircle2 } from 'lucide-react';
import { Order } from '@/types/order';
import { StatusBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface OrderDetailModalProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onMarkReady?: () => void;
  onMarkReceived?: () => void;
  isLoading?: boolean;
}

export function OrderDetailModal({
  order,
  open,
  onClose,
  onAccept,
  onReject,
  onMarkReady,
  onMarkReceived,
  isLoading,
}: OrderDetailModalProps) {
  if (!order) return null;

  const totalPrice = order.order_items?.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  ) || 0;

  const timestamps = [
    { label: 'Order Placed', time: order.new_order_at, active: true },
    { label: 'Accepted', time: order.accepted_at, active: !!order.accepted_at },
    { label: 'Ready', time: order.ready_at, active: !!order.ready_at },
    { label: 'Received', time: order.received_at, active: !!order.received_at },
  ];

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{order.order_id}</DialogTitle>
            <StatusBadge status={order.status} />
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Customer Info */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Customer Information</h4>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{order.customer_name}</p>
                  <p className="text-sm text-muted-foreground">Customer ID: {order.customer_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p>{order.phone_number}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Order Items */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Order Items</h4>
            <div className="space-y-2">
              {order.order_items?.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{item.item}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="font-medium">Total</span>
              <span className="text-lg font-semibold">${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Order Timeline</h4>
            <div className="space-y-3">
              {timestamps.map((step, index) => (
                <div key={step.label} className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center ${
                      step.active
                        ? 'bg-success text-success-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.active ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <span className="text-xs">{index + 1}</span>
                    )}
                  </div>
                  <div>
                    <p className={step.active ? 'font-medium' : 'text-muted-foreground'}>
                      {step.label}
                    </p>
                    {step.time && (
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(step.time), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {(onAccept || onReject || onMarkReady || onMarkReceived) && (
            <>
              <Separator />
              <div className="flex gap-3">
                {onAccept && (
                  <Button
                    onClick={onAccept}
                    disabled={isLoading}
                    className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                  >
                    Accept Order
                  </Button>
                )}
                {onReject && (
                  <Button
                    onClick={onReject}
                    disabled={isLoading}
                    variant="destructive"
                    className="flex-1"
                  >
                    Reject Order
                  </Button>
                )}
                {onMarkReady && (
                  <Button
                    onClick={onMarkReady}
                    disabled={isLoading}
                    className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                  >
                    Mark as Ready
                  </Button>
                )}
                {onMarkReceived && (
                  <Button
                    onClick={onMarkReceived}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Mark as Received
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
