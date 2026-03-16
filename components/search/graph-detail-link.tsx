'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getGraphDetailUrl, resolveGraphDetailUrl } from '@/lib/media-url';
import type { GraphListItem } from '@/types/search';

type GraphDetailLinkProps = {
  graph: GraphListItem;
  className?: string;
  children: React.ReactNode;
  title?: string;
};

const resolvedHrefCache = new Map<number, string | null>();
const pendingHrefCache = new Map<number, Promise<string | null>>();

async function resolveGraphHrefCached(graph: GraphListItem): Promise<string | null> {
  const directHref = getGraphDetailUrl(graph);
  if (directHref) return directHref;

  if (resolvedHrefCache.has(graph.id)) {
    return resolvedHrefCache.get(graph.id) ?? null;
  }

  const pending = pendingHrefCache.get(graph.id);
  if (pending) return pending;

  const request = resolveGraphDetailUrl(graph)
    .then((href) => {
      resolvedHrefCache.set(graph.id, href ?? null);
      pendingHrefCache.delete(graph.id);
      return href ?? null;
    })
    .catch(() => {
      pendingHrefCache.delete(graph.id);
      return null;
    });

  pendingHrefCache.set(graph.id, request);
  return request;
}

export function GraphDetailLink({ graph, className, children, title }: GraphDetailLinkProps) {
  const router = useRouter();
  const [href, setHref] = React.useState<string | null>(() => getGraphDetailUrl(graph));
  const [resolving, setResolving] = React.useState(false);

  React.useEffect(() => {
    const directHref = getGraphDetailUrl(graph);
    setHref(directHref);
    if (directHref) return;

    let cancelled = false;
    void resolveGraphHrefCached(graph).then((resolved) => {
      if (!cancelled && resolved) setHref(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [graph]);

  const handleClick = React.useCallback(async () => {
    if (href) {
      router.push(href);
      return;
    }
    if (resolving) return;

    setResolving(true);
    try {
      const resolved = await resolveGraphHrefCached(graph);
      if (resolved) {
        setHref(resolved);
        router.push(resolved);
      }
    } finally {
      setResolving(false);
    }
  }, [graph, href, resolving, router]);

  if (href) {
    return (
      <Link href={href} className={className} title={title}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className={className}
      title={title}
      aria-busy={resolving}
      disabled={resolving}
    >
      {children}
    </button>
  );
}
