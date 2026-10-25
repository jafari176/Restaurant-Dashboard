import { format } from 'date-fns';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';
import { Special, isLive } from '@/types/special';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SpecialCardProps {
  special: Special;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRunAgain?: () => void;
  disabled?: boolean;
}

function dateRange(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  const sameMonth = s.getMonth() === e.getMonth();
  return sameMonth
    ? `${format(s, 'MMM d')} – ${format(e, 'd')}`
    : `${format(s, 'MMM d')} – ${format(e, 'MMM d')}`;
}

export function SpecialCard({
  special,
  onToggle,
  onEdit,
  onDelete,
  onRunAgain,
  disabled,
}: SpecialCardProps) {
  const live = isLive(special);

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 transition-colors',
        live && 'border-status-ready',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-lg text-foreground truncate">{special.name_en}</h3>
            {live && (
              <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                On calls now
              </span>
            )}
          </div>

          {special.name_fr && (
            <p className="text-sm text-muted-foreground truncate">{special.name_fr}</p>
          )}

          <div className="mt-2 flex items-center gap-3 text-sm">
            <span className="font-semibold text-foreground">${special.price.toFixed(2)}</span>
            <span className="text-muted-foreground">
              {dateRange(special.start_date, special.end_date)}
            </span>
          </div>

          {special.description && (
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
              {special.description}
            </p>
          )}
        </div>

        {onToggle && (
          // 44px touch target around the switch itself.
          <button
            onClick={onToggle}
            disabled={disabled}
            aria-label={special.is_active ? 'Turn special off' : 'Turn special on'}
            className="flex h-11 w-11 shrink-0 items-center justify-center"
          >
            <Switch checked={special.is_active} className="pointer-events-none scale-110" />
          </button>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        {onRunAgain && (
          <Button variant="outline" onClick={onRunAgain} disabled={disabled} className="h-11 flex-1 gap-2">
            <RotateCcw className="h-4 w-4" />
            Run again
          </Button>
        )}
        {onEdit && (
          <Button variant="outline" onClick={onEdit} disabled={disabled} className="h-11 flex-1 gap-2">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
        {onDelete && (
          <Button
            variant="outline"
            onClick={onDelete}
            disabled={disabled}
            aria-label="Delete special"
            className="h-11 w-11 shrink-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
