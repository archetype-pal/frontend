'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LightboxViewer } from '@/components/lightbox/lightbox-viewer';
import { useLightboxStore } from '@/stores/lightbox-store';
import type { WorksetDetail } from '@/types/workset';

/**
 * Read-only citable view of a shared workset. Hydrates the (singleton) lightbox
 * store from the fetched payload without writing Dexie, so visiting a shared
 * link never disturbs the visitor's own local lightbox. "Open in Lightbox"
 * persists the payload to Dexie and hands off to the full editable lightbox.
 */
export function WorksetViewerClient({ workset }: { workset: WorksetDetail }) {
  const router = useRouter();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    useLightboxStore
      .getState()
      .loadWorksetPayload(workset.payload, { persist: false })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [workset.payload]);

  const openEditable = async () => {
    await useLightboxStore.getState().loadWorksetPayload(workset.payload, { persist: true });
    // Pass the target workspace so /lightbox lands on it: the page runs
    // initialize() on mount, which would otherwise reset currentWorkspaceId to
    // the user's oldest local workspace.
    const targetWorkspace = workset.payload.workspaces[0]?.id;
    router.push(
      targetWorkspace ? `/lightbox?workspace=${encodeURIComponent(targetWorkspace)}` : '/lightbox'
    );
  };

  const ownerName =
    [workset.owner.first_name, workset.owner.last_name].filter(Boolean).join(' ') ||
    workset.owner.username;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{workset.title}</h1>
          <p className="text-sm text-muted-foreground">Shared workset · by {ownerName}</p>
          {workset.description ? (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{workset.description}</p>
          ) : null}
        </div>
        <Button size="sm" onClick={openEditable}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in Lightbox
        </Button>
      </div>

      <div className="h-[70vh] min-h-[480px] overflow-hidden rounded-lg border bg-secondary">
        {ready ? (
          <LightboxViewer />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading workset…
          </div>
        )}
      </div>
    </div>
  );
}
