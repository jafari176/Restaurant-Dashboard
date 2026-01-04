import { cn } from '@/lib/utils';
import { OrderStatus } from '@/types/order';

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'status-badge-new' },
  in_progress: { label: 'In Progress', className: 'status-badge-in-progress' },
  ready: { label: 'Ready', className: 'status-badge-ready' },
  received: { label: 'Received', className: 'status-badge-received' },
  rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive border-destructive' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
