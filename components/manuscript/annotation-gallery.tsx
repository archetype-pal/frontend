'use client';

import * as React from 'react';
import Link from 'next/link';
import { useIiifThumbnailUrl } from '@/hooks/use-iiif-thumbnail';
import type { Allograph } from '@/types/allographs';
import type { HandType } from '@/types/hands';
import type { BackendGraph } from '@/services/annotations';
import { cn } from '@/lib/utils';

interface AllographGroup {
  allographId: number;
  allographName: string;
  graphs: BackendGraph[];
}

interface HandGroup {
  handId: number | null;
  handName: string;
  allographs: AllographGroup[];
}

function groupAnnotations(
  graphs: BackendGraph[],
  hands: HandType[],
  allographs: Allograph[]
): HandGroup[] {
  const handLabelById = new Map(hands.map((h) => [h.id, h.name]));
  const allographLabelById = new Map(allographs.map((a) => [a.id, a.name]));
  const handMap = new Map<number | null, Map<number, BackendGraph[]>>();

  for (const graph of graphs) {
    if (typeof graph.allograph !== 'number') continue;

    const handKey = typeof graph.hand === 'number' ? graph.hand : null;
    let allographMap = handMap.get(handKey);
    if (!allographMap) {
      allographMap = new Map();
      handMap.set(handKey, allographMap);
    }
    const list = allographMap.get(graph.allograph) ?? [];
    list.push(graph);
    allographMap.set(graph.allograph, list);
  }

  return Array.from(handMap, ([handKey, allographMap]) => ({
    handId: handKey,
    handName: handKey === null ? 'Unattributed' : (handLabelById.get(handKey) ?? `Hand ${handKey}`),
    allographs: Array.from(allographMap, ([allographId, graphs]) => ({
      allographId,
      allographName: allographLabelById.get(allographId) ?? `Allograph ${allographId}`,
      graphs,
    })).sort((a, b) => a.allographName.localeCompare(b.allographName)),
  })).sort((a, b) => a.handName.localeCompare(b.handName));
}

interface AnnotationGalleryProps {
  manuscriptId: string;
  imageId: string;
  iiifImage: string;
  graphs: BackendGraph[];
  hands: HandType[];
  allographs: Allograph[];
}

function GraphThumb({
  graph,
  iiifImage,
  manuscriptId,
  imageId,
}: {
  graph: BackendGraph;
  iiifImage: string;
  manuscriptId: string;
  imageId: string;
}) {
  // Legacy GeoJSON polygons are stored with bottom-left origin (Web Mercator);
  // useIiifThumbnailUrl handles the y-flip and bounds clamping via info.json.
  const annotationJson = React.useMemo(() => JSON.stringify(graph.annotation), [graph.annotation]);
  const thumb = useIiifThumbnailUrl(iiifImage, annotationJson, 250);
  const href = `/manuscripts/${manuscriptId}/images/${imageId}?graph=${graph.id}`;

  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col items-center gap-1 rounded border bg-card p-2 transition',
        'hover:border-primary'
      )}
    >
      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded bg-muted">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={`Annotation ${graph.id}`}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-xs text-muted-foreground">…</span>
        )}
      </div>
      <span className="text-xs text-muted-foreground group-hover:text-primary">#{graph.id}</span>
    </Link>
  );
}

const handAnchorId = (handId: number | null) => `hand-${handId ?? 'unattributed'}`;

export function AnnotationGallery({
  manuscriptId,
  imageId,
  iiifImage,
  graphs,
  hands,
  allographs,
}: AnnotationGalleryProps) {
  const groups = React.useMemo(
    () => groupAnnotations(graphs, hands, allographs),
    [graphs, hands, allographs]
  );

  if (groups.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
        No annotations on this image yet.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.length > 1 && (
        <nav aria-label="Hands on this image">
          <h2 className="text-base font-semibold">Hands</h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {groups.map((g) => (
              <li key={g.handId ?? 'unattributed'}>
                <a
                  href={`#${handAnchorId(g.handId)}`}
                  className="rounded border bg-card px-2 py-1 hover:border-primary"
                >
                  {g.handName}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {groups.map((handGroup) => {
        const anchorId = handAnchorId(handGroup.handId);
        return (
          <section key={anchorId} id={anchorId}>
            <h2 className="text-lg font-semibold">{handGroup.handName}</h2>
            <ul className="mt-1 mb-3 flex flex-wrap gap-2 text-sm">
              {handGroup.allographs.map((a) => (
                <li key={a.allographId}>
                  <a
                    href={`#${anchorId}-allograph-${a.allographId}`}
                    className="rounded border bg-muted px-2 py-0.5 text-muted-foreground hover:border-primary hover:text-foreground"
                  >
                    {a.allographName} ({a.graphs.length})
                  </a>
                </li>
              ))}
            </ul>

            <div className="space-y-6">
              {handGroup.allographs.map((allographGroup) => (
                <div
                  key={allographGroup.allographId}
                  id={`${anchorId}-allograph-${allographGroup.allographId}`}
                  className="space-y-2"
                >
                  <h3 className="text-sm font-medium">{allographGroup.allographName}</h3>
                  <div className="flex flex-wrap gap-2">
                    {allographGroup.graphs.map((graph) => (
                      <GraphThumb
                        key={graph.id}
                        graph={graph}
                        iiifImage={iiifImage}
                        manuscriptId={manuscriptId}
                        imageId={imageId}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
