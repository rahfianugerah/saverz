import { cn } from '../../lib/utils';

interface ModeOption<T extends string> {
  value: T;
  label: string;
}

interface ModeSwitchProps<T extends string> {
  value: T;
  options: ModeOption<T>[];
  onChange: (next: T) => void;
  className?: string;
}

export function ModeSwitch<T extends string>({ value, options, onChange, className }: ModeSwitchProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-border bg-muted p-1',
        className
      )}
      role="tablist"
      aria-label="Mode switch"
    >
      {options.map((option) => {
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
              isActive ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
            )}
            aria-selected={isActive}
            role="tab"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
