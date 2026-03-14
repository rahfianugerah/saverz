import { motion } from 'framer-motion';
import { useId } from 'react';
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
  const id = useId();

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
          <motion.button
            key={option.value}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
            aria-selected={isActive}
            role="tab"
          >
            {isActive && (
              <motion.span
                layoutId={`mode-switch-indicator-${id}`}
                className="absolute inset-0 rounded-md bg-card shadow-sm"
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
