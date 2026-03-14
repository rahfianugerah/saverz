import * as React from 'react';
import { HiChevronDown } from 'react-icons/hi2';
import { cn } from '../../lib/utils';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string = string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (next: T) => void;
  className?: string;
  menuClassName?: string;
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function Select<T extends string = string>({
  value,
  options,
  onChange,
  className,
  menuClassName,
  id,
  ariaLabel,
  disabled = false,
}: SelectProps<T>) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  const selected = options.find((option) => option.value === value) ?? options[0];

  React.useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const selectedButton = listRef.current?.querySelector<HTMLButtonElement>(`button[data-value="${CSS.escape(value)}"]`);
    selectedButton?.focus();
  }, [open, value]);

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;

    const buttons = listRef.current ? [...listRef.current.querySelectorAll<HTMLButtonElement>('button[data-option]')] : [];
    if (buttons.length === 0) return;

    const currentIndex = buttons.findIndex((button) => button === document.activeElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, buttons.length - 1);
      buttons[nextIndex]?.focus();
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
      buttons[nextIndex]?.focus();
    }

    if (event.key === 'Enter' && currentIndex >= 0) {
      event.preventDefault();
      const nextValue = buttons[currentIndex].dataset.value as T;
      onChange(nextValue);
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={handleListKeyDown}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-all duration-200 hover:border-primary/45 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <HiChevronDown
          size={16}
          className={cn('shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <div
        ref={listRef}
        role="listbox"
        aria-activedescendant={id ? `${id}-${value}` : undefined}
        className={cn(
          'absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-border bg-card/95 p-1 shadow-xl backdrop-blur-sm transition-all duration-200',
          open ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0',
          menuClassName
        )}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              id={id ? `${id}-${option.value}` : undefined}
              type="button"
              role="option"
              aria-selected={active}
              data-option
              data-value={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'bg-primary/20 text-foreground' : 'text-foreground/90 hover:bg-accent/70 hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
