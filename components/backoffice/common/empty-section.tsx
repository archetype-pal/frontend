'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptySectionProps {
  /** Icon displayed above the message */
  icon?: React.ComponentType<{ className?: string }>;
  /** Primary message, e.g. "No catalogue numbers yet" */
  title: string;
  /** Helpful description explaining why this matters */
  description?: string;
  /** Label for the action button */
  actionLabel?: string;
  /** Called when the action button is clicked */
  onAction?: () => void;
  className?: string;
}

/**
 * A friendly empty state for list sections within an entity editor.
 *
 * Provides contextual guidance about why the section is empty and
 * what the professor should do next.
 *
 * Usage:
 * ```tsx
 * {items.length === 0 ? (
 *   <EmptySection
 *     title="No catalogue numbers yet"
 *     description="Add one to help researchers find this manuscript."
 *     actionLabel="Add catalogue number"
 *     onAction={() => setAddDialogOpen(true)}
 *   />
 * ) : (
 *   <CatalogueNumbersList items={items} />
 * )}
 * ```
 */
export function EmptySection({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptySectionProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed py-8 px-4 text-center',
        className
      )}
    >
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground max-w-sm">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={onAction}>
          <Plus className="h-3.5 w-3.5" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
