import * as React from 'react';

import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  title?: string;
}

/**
 * Compact segmented control with radiogroup semantics — active segment uses the
 * primary token (the scriptorial "active" idiom). Used for mutually-exclusive
 * choices like the viewer's View (Allograph/Text/Both) and text Show modes.
 */
export function Segmented<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  className,
}: {
  ariaLabel: string;
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  className?: string;
}) {
  const buttonsRef = React.useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = options.findIndex((opt) => opt.value === value);
  // Roving tabindex: only one segment is in the tab order (the checked one, or
  // the first enabled one if none is checked) — arrow keys move between the rest.
  const tabbableIndex = activeIndex >= 0 ? activeIndex : options.findIndex((opt) => !opt.disabled);

  // Arrow-key navigation per the ARIA radiogroup pattern: moving focus also
  // selects (selection follows focus), wrapping and skipping disabled segments.
  const selectAtOffset = (from: number, direction: 1 | -1) => {
    const count = options.length;
    for (let step = 1; step <= count; step += 1) {
      const next = (from + direction * step + count * step) % count;
      if (!options[next].disabled) {
        buttonsRef.current[next]?.focus();
        onChange(options[next].value);
        return;
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        selectAtOffset(index, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        selectAtOffset(index, -1);
        break;
      case 'Home':
        event.preventDefault();
        selectAtOffset(-1, 1);
        break;
      case 'End':
        event.preventDefault();
        selectAtOffset(0, -1);
        break;
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5',
        className
      )}
    >
      {options.map((opt, index) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              buttonsRef.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={index === tabbableIndex ? 0 : -1}
            disabled={opt.disabled}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
