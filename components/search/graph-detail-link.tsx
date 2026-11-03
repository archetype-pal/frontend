'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getGraphDetailUrl, resolveGraphDetailUrl, type GraphRouteInput } from '@/lib/media-url';

type GraphDetailLinkProps = {
  graph: GraphRouteInput;
  className?: string;
  children: React.ReactNode;
  title?: string;
};

export function GraphDetailLink({ graph, className, children, title }: GraphDetailLinkProps) {
  const router = useRouter();
  // The direct href is fully derivable from `graph`, so compute it during render.
  const directHref = getGraphDetailUrl(graph);
  // Otherwise the image is looked up. A lookup that finds nothing is an error,
  // not a cached null, so a network blip does not leave a dead link: the next
  // mount or click asks again.
  const {
    data: resolvedHref,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['graph-detail-href', String(graph.id)],
    queryFn: async () => {
      const href = await resolveGraphDetailUrl(graph);
      if (!href) throw new Error(`No detail page for graph ${graph.id}`);
      return href;
    },
    enabled: directHref === null,
    staleTime: Infinity,
    retry: false,
  });

  const href = directHref ?? resolvedHref ?? null;

  const handleClick = React.useCallback(async () => {
    const { data } = await refetch();
    if (data) router.push(data);
  }, [refetch, router]);

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
      aria-busy={isFetching}
      disabled={isFetching}
    >
      {children}
    </button>
  );
}
