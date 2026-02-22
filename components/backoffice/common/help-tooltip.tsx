'use client';

import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { helpTexts, type HelpEntry } from '@/lib/backoffice/help-texts';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
  /** Dot-notation key into the help-texts dictionary, e.g. "manuscript.hair_type" */
  field: string;
  /** Override the dictionary entry with a custom entry */
  entry?: HelpEntry;
  className?: string;
}

/**
 * Small (?) icon that shows a tooltip with field-level help text.
 *
 * Usage:
 * ```tsx
 * <Label>Hair type <HelpTooltip field="manuscript.hair_type" /></Label>
 * ```
 */
export function HelpTooltip({ field, entry, className }: HelpTooltipProps) {
  const help = entry ?? helpTexts[field];
  if (!help) return null;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            className
          )}
          tabIndex={-1}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="sr-only">Help</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        <p>{help.description}</p>
        {help.example && (
          <p className="mt-1 text-muted-foreground">
            Example: <code className="rounded bg-muted px-1">{help.example}</code>
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * A Label wrapper that adds a required asterisk and optional help tooltip.
 *
 * Usage:
 * ```tsx
 * <FieldLabel required helpField="manuscript.hair_type">Hair type</FieldLabel>
 * ```
 */
interface FieldLabelProps {
  children: React.ReactNode;
  /** Show a red asterisk */
  required?: boolean;
  /** Key into help-texts dictionary */
  helpField?: string;
  /** Custom help entry (overrides dictionary lookup) */
  helpEntry?: HelpEntry;
  htmlFor?: string;
  className?: string;
}

export function FieldLabel({
  children,
  required,
  helpField,
  helpEntry,
  htmlFor,
  className,
}: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'flex items-center gap-1.5 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
    >
      {children}
      {required && (
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
      )}
      {helpField && <HelpTooltip field={helpField} entry={helpEntry} />}
    </label>
  );
}
