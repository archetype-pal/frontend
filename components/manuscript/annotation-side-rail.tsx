'use client';

import { History, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { type EditEvent, fetchEventsForTarget } from '@/services/edit-events';

interface AnnotationSideRailProps {
  /** When set, shows the rail for the given target. */
  target: { kind: 'graph'; id: number } | null;
  token: string | null;
  onClose: () => void;
}

/**
 * Side-docked panel showing the audit history for a single annotation. The
 * comments tab will be wired in once the AnnotationComment API ships; for
 * now this is a single-pane history view fed by `/common/edit-events/`.
 *
 * Lives inline with the OSD viewport rather than over it.
 */
export function AnnotationSideRail({ target, token, onClose }: AnnotationSideRailProps) {
  const [events, setEvents] = useState<EditEvent[]>([]);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    void (async () => {
      const rows = await fetchEventsForTarget(target.kind, target.id, token);
      if (!cancelled) setEvents(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [target, token]);

  if (!target) return null;

  return (
    <aside className="flex h-full w-80 min-w-[280px] flex-col border-l bg-background">
      <header className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <History className="h-3.5 w-3.5" />
          History — {target.kind} #{target.id}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
          <X className="h-4 w-4" />
        </Button>
      </header>
      <div className="flex-1 overflow-auto">
        {events.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No history yet.</p>
        ) : (
          <ul className="divide-y">
            {events.map((e) => (
              <li key={e.id} className="px-3 py-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {e.actor_username ?? 'unknown'}
                  </span>
                  <time dateTime={e.created}>{new Date(e.created).toLocaleString()}</time>
                </div>
                <p className="text-foreground">
                  {actionLabel(e.action)} — {e.summary || e.target_type}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function actionLabel(a: EditEvent['action']): string {
  switch (a) {
    case 'created':
      return 'Created';
    case 'updated':
      return 'Updated';
    case 'deleted':
      return 'Deleted';
    case 'status_changed':
      return 'Status change';
    case 'commented':
      return 'Commented';
    default:
      return a;
  }
}
