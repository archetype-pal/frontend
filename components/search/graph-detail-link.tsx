'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getGraphDetailUrl, resolveGraphDetailUrl, type GraphRouteInput } from '@/lib/media-url';

type GraphDetailLinkProps = {
  graph: GraphRouteInput;
  className?: string;
  children: React.ReactNode;
  title?: string;
};

const resolvedHrefCache = new Map<string, string | null>();
const pendingHrefCache = new Map<string, Promise<string | null>>();

async function resolveGraphHrefCached(graph: GraphRouteInput): Promise<string | null> {
  const directHref = getGraphDetailUrl(graph);
  if (directHref) return directHref;

  const cacheKey = String(graph.id);
  if (resolvedHrefCache.has(cacheKey)) {
    return resolvedHrefCache.get(cacheKey) ?? null;
  }

  const pending = pendingHrefCache.get(cacheKey);
  if (pending) return pending;

  const request = resolveGraphDetailUrl(graph)
    .then((href) => {
      resolvedHrefCache.set(cacheKey, href ?? null);
      pendingHrefCache.delete(cacheKey);
      return href ?? null;
    })
    .catch(() => {
      pendingHrefCache.delete(cacheKey);
      return null;
    });

  pendingHrefCache.set(cacheKey, request);
  return request;
}

export function GraphDetailLink({ graph, className, children, title }: GraphDetailLinkProps) {
  const router = useRouter();
  // The direct href is fully derivable from `graph`, so compute it during render.
  const directHref = getGraphDetailUrl(graph);
  // The async-resolved href is an override that must reset whenever `graph` changes.
  const [resolvedHref, setResolvedHref] = React.useState<string | null>(null);
  const [prevGraph, setPrevGraph] = React.useState(graph);
  if (prevGraph !== graph) {
    setPrevGraph(graph);
    setResolvedHref(null);
  }
  const [resolving, setResolving] = React.useState(false);

  const href = directHref ?? resolvedHref;

  React.useEffect(() => {
    if (getGraphDetailUrl(graph)) return;

    let cancelled = false;
    void resolveGraphHrefCached(graph).then((resolved) => {
      if (!cancelled && resolved) setResolvedHref(resolved);
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
        setResolvedHref(resolved);
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
