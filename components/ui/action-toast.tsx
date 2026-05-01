'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Info, Layers, Save, SquarePen, SquarePlus, Trash2, X, XCircle } from 'lucide-react';
import { toast, type ExternalToast } from 'sonner';

import { cn } from '@/lib/utils';

export type ActionNotificationKind =
  | 'selected'
  | 'created'
  | 'updated'
  | 'saved'
  | 'deleted'
  | 'bulk-created'
  | 'bulk-updated'
  | 'bulk-deleted'
  | 'error';

type ActionNotificationOptions = {
  kind: ActionNotificationKind;
  title: ReactNode;
  description?: ReactNode;
  id?: string | number;
  duration?: number;
};

type ActionNotificationConfig = {
  icon: LucideIcon;
  iconClassName: string;
  accentClassName: string;
};

const ACTION_NOTIFICATION_CONFIG: Record<ActionNotificationKind, ActionNotificationConfig> = {
  selected: {
    icon: Info,
    iconClassName: 'bg-blue-50 text-blue-700 ring-blue-200',
    accentClassName: 'bg-blue-500',
  },
  created: {
    icon: SquarePlus,
    iconClassName: 'bg-teal-50 text-teal-700 ring-teal-200',
    accentClassName: 'bg-teal-500',
  },
  updated: {
    icon: SquarePen,
    iconClassName: 'bg-amber-50 text-amber-700 ring-amber-200',
    accentClassName: 'bg-amber-500',
  },
  saved: {
    icon: Save,
    iconClassName: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    accentClassName: 'bg-emerald-500',
  },
  deleted: {
    icon: Trash2,
    iconClassName: 'bg-red-50 text-red-700 ring-red-200',
    accentClassName: 'bg-red-500',
  },
  'bulk-created': {
    icon: Layers,
    iconClassName: 'bg-teal-50 text-teal-700 ring-teal-200',
    accentClassName: 'bg-teal-500',
  },
  'bulk-updated': {
    icon: Layers,
    iconClassName: 'bg-sky-50 text-sky-700 ring-sky-200',
    accentClassName: 'bg-sky-500',
  },
  'bulk-deleted': {
    icon: Trash2,
    iconClassName: 'bg-red-50 text-red-700 ring-red-200',
    accentClassName: 'bg-red-500',
  },
  error: {
    icon: XCircle,
    iconClassName: 'bg-red-50 text-red-700 ring-red-200',
    accentClassName: 'bg-red-600',
  },
};

function ActionToast({
  toastId,
  kind,
  title,
  description,
}: ActionNotificationOptions & { toastId: string | number }) {
  const config = ACTION_NOTIFICATION_CONFIG[kind];
  const Icon = config.icon;
  const role = kind === 'error' ? 'alert' : 'status';

  return (
    <div
      role={role}
      aria-live={kind === 'error' ? 'assertive' : 'polite'}
      className="relative flex w-[26rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border bg-card text-card-foreground shadow-xl ring-1 ring-black/5"
    >
      <div className={cn('w-1 shrink-0', config.accentClassName)} />
      <div className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3">
        <div
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1',
            config.iconClassName
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="text-sm font-semibold leading-5">{title}</div>
          {description ? (
            <div className="text-xs leading-5 text-muted-foreground">{description}</div>
          ) : null}
        </div>

        <button
          type="button"
          aria-label="Dismiss notification"
          className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={() => toast.dismiss(toastId)}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function showActionNotification({
  kind,
  title,
  description,
  id,
  duration,
}: ActionNotificationOptions) {
  const toastOptions: ExternalToast = {
    id,
    duration: duration ?? (kind === 'error' ? 6000 : 2800),
    unstyled: true,
  };

  return toast.custom(
    (toastId) => (
      <ActionToast toastId={toastId} kind={kind} title={title} description={description} />
    ),
    toastOptions
  );
}

export function dismissActionNotification(id?: string | number) {
  return toast.dismiss(id);
}
