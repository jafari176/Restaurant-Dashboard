import { cn } from '@/lib/utils';

interface TabButtonProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  colorClass?: string;
}

export function TabButton({ label, count, isActive, onClick, colorClass }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative px-4 py-3 font-medium text-sm transition-all rounded-lg',
        isActive
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'ml-2 px-2 py-0.5 rounded-full text-xs font-semibold',
          isActive ? colorClass : 'bg-muted text-muted-foreground'
        )}
      >
        {count}
      </span>
    </button>
  );
}
