'use client';

/**
 * The network view (AI programme W2.3): who appears with whom in the charters.
 *
 * An index of everything in the network on one side, and on the other the
 * chosen node: its neighbourhood drawn round it, and its connections listed in
 * words. The drawing is for the eye and is hidden from assistive technology;
 * the list says everything it shows, and every node in it can be chosen from
 * the keyboard. The chosen node is kept in the URL (`?node=`), so a view can be
 * linked and Back returns to the previous node.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Download, ExternalLink, Network, Search, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import {
  MAX_DRAWN,
  NETWORK_KEY,
  connectionKey,
  degree,
  groupConnections,
  indexNetwork,
  neighbourhood,
  nodeHref,
  radialLayout,
  rankNodes,
  startingNode,
  type Connection,
  type Neighbourhood,
  type NetworkIndex,
  type Point,
} from '@/lib/network';
import { NETWORK_GEXF_URL, getNetwork } from '@/services/diplomatic';
import { NETWORK_KINDS, type NetworkKind, type NetworkNode } from '@/types/diplomatic';

const ALL = '__all__';
const INDEX_PAGE = 50;
const LABEL_LIMIT = 28;
/** Up to this many on the outer ring, each is labelled. */
const LABELLED_OUTER = 24;

const KIND_FILL: Record<NetworkKind, string> = {
  person: 'fill-chart-2',
  place: 'fill-chart-4',
  charter: 'fill-chart-1',
  scribe: 'fill-chart-3',
};

/** Shape as well as colour, so the kinds stay apart without colour vision. */
function NodeShape({
  kind,
  size,
  className,
}: {
  kind: NetworkKind;
  size: number;
  className?: string;
}) {
  const fill = `${KIND_FILL[kind]} ${className ?? ''}`;
  if (kind === 'charter') {
    return (
      <rect x={-size} y={-size} width={size * 2} height={size * 2} rx={size / 4} className={fill} />
    );
  }
  if (kind === 'place') {
    return (
      <polygon
        points={`0,${-size * 1.25} ${size * 1.25},0 0,${size * 1.25} ${-size * 1.25},0`}
        className={fill}
      />
    );
  }
  if (kind === 'scribe') {
    return (
      <polygon
        points={`0,${-size * 1.3} ${size * 1.2},${size} ${-size * 1.2},${size}`}
        className={fill}
      />
    );
  }
  return <circle r={size} className={fill} />;
}

function shorten(label: string): string {
  return label.length > LABEL_LIMIT ? `${label.slice(0, LABEL_LIMIT - 1)}…` : label;
}

interface DrawnNode {
  node: NetworkNode;
  x: number;
  y: number;
  size: number;
  isCentre: boolean;
  label: {
    text: string;
    x: number;
    y: number;
    anchor: 'start' | 'middle' | 'end';
    fontSize: number;
  } | null;
}

/** Each node's place, size and label, worked out once so the drawing can be fitted round them. */
function drawnNodes(
  index: NetworkIndex,
  hood: Neighbourhood,
  positions: Map<string, Point>
): DrawnNode[] {
  const inner = new Set(hood.inner);
  // A small outer ring is labelled too; a large one would be a wall of text.
  const outerLabelled = hood.outer.length <= LABELLED_OUTER;
  return [hood.centre, ...hood.inner, ...hood.outer].flatMap((id) => {
    const node = index.nodes.get(id);
    const point = positions.get(id);
    if (!node || !point) return [];
    const isCentre = id === hood.centre;
    const size = isCentre ? 13 : inner.has(id) ? 8 : 5;
    const labelled = isCentre || inner.has(id) || outerLabelled;
    const away = Math.hypot(point.x, point.y) || 1;
    const label = labelled
      ? {
          text: shorten(node.label),
          x: isCentre ? 0 : (point.x / away) * (size + 6),
          y: isCentre ? size + 18 : (point.y / away) * (size + 6) + 4,
          anchor: isCentre
            ? ('middle' as const)
            : point.x > 5
              ? ('start' as const)
              : point.x < -5
                ? ('end' as const)
                : ('middle' as const),
          fontSize: isCentre ? 17 : inner.has(id) ? 14 : 12,
        }
      : null;
    return [{ node, x: point.x, y: point.y, size, isCentre, label }];
  });
}

/** The box round every node and label, with a margin, so nothing is drawn smaller than it need be. */
const MIN_VIEW = 480;

function fit(items: DrawnNode[]): string {
  let [left, top, right, bottom] = [Infinity, Infinity, -Infinity, -Infinity];
  const take = (x0: number, y0: number, x1: number, y1: number) => {
    left = Math.min(left, x0);
    top = Math.min(top, y0);
    right = Math.max(right, x1);
    bottom = Math.max(bottom, y1);
  };
  for (const { x, y, size, label } of items) {
    take(x - size * 1.3, y - size * 1.3, x + size * 1.3, y + size * 1.3);
    if (!label) continue;
    // An estimate: the drawing has no text metrics before it is laid out.
    const width = label.text.length * label.fontSize * 0.56;
    const from = label.anchor === 'start' ? 0 : label.anchor === 'end' ? -width : -width / 2;
    take(
      x + label.x + from,
      y + label.y - label.fontSize,
      x + label.x + from + width,
      y + label.y + 4
    );
  }
  const margin = 12;
  // Never closer than this: a node alone would otherwise fill the whole panel.
  const width = Math.max(right - left + margin * 2, MIN_VIEW);
  const height = Math.max(bottom - top + margin * 2, MIN_VIEW / 2);
  return `${(left + right - width) / 2} ${(top + bottom - height) / 2} ${width} ${height}`;
}

function NetworkDrawing({
  index,
  hood,
  onSelect,
}: {
  index: NetworkIndex;
  hood: Neighbourhood;
  onSelect: (id: string) => void;
}) {
  const positions = useMemo(() => radialLayout(index, hood), [index, hood]);
  const items = useMemo(() => drawnNodes(index, hood, positions), [index, hood, positions]);

  return (
    <svg
      viewBox={fit(items)}
      className="h-auto max-h-[36rem] w-full"
      aria-hidden="true"
      data-testid="network-drawing"
    >
      <g>
        {hood.edges.map((edge) => {
          const from = positions.get(edge.source);
          const to = positions.get(edge.target);
          if (!from || !to) return null;
          const central = edge.source === hood.centre || edge.target === hood.centre;
          return (
            <line
              key={`${edge.source}-${edge.target}-${edge.relation}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className={central ? 'stroke-foreground/45' : 'stroke-muted-foreground/25'}
              strokeWidth={central ? 1.5 : 1}
            />
          );
        })}
      </g>
      <g>
        {items.map(({ node, x, y, size, isCentre, label }) => (
          <g
            key={node.id}
            transform={`translate(${x} ${y})`}
            className="cursor-pointer"
            onClick={() => onSelect(node.id)}
          >
            <title>{node.label}</title>
            <NodeShape
              kind={node.kind}
              size={size}
              className={isCentre ? 'stroke-foreground stroke-2' : 'stroke-background'}
            />
            {label && (
              <text
                x={label.x}
                y={label.y}
                textAnchor={label.anchor}
                fontSize={label.fontSize}
                className={isCentre ? 'fill-foreground font-semibold' : 'fill-foreground'}
              >
                {label.text}
              </text>
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}

function Legend() {
  const t = useTranslations('network');
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {NETWORK_KINDS.map((kind) => (
        <li key={kind} className="flex items-center gap-1.5">
          <svg viewBox="-9 -9 18 18" className="h-3.5 w-3.5" aria-hidden="true">
            <NodeShape kind={kind} size={6} />
          </svg>
          {t(`kinds.${kind}`)}
        </li>
      ))}
    </ul>
  );
}

function ConnectionList({
  connections,
  onSelect,
}: {
  connections: Connection[];
  onSelect: (id: string) => void;
}) {
  const t = useTranslations('network');
  const phrase = (connection: Connection) => {
    const key = connectionKey(connection);
    return t.has(key) ? t(key as never) : t('otherRelation', { relation: connection.relation });
  };

  // A role and a statement can read alike ("Beneficiary of" a charter, and of
  // a person in a statement): they are listed under one heading, where the
  // first of them stands.
  const sections = new Map<string, Connection[]>();
  for (const [, items] of groupConnections(connections)) {
    const heading = phrase(items[0]!);
    sections.set(heading, [...(sections.get(heading) ?? []), ...items]);
  }

  return (
    <div className="space-y-4">
      {[...sections].map(([heading, items], i) => (
        <section key={heading} aria-labelledby={`connections-${i}`}>
          <h3 id={`connections-${i}`} className="text-sm font-medium text-muted-foreground">
            {heading}
          </h3>
          <ul className="mt-1 flex flex-wrap gap-x-1 gap-y-1">
            {items.map((connection) => (
              <li
                key={`${connection.node.id}-${connection.charter?.id ?? ''}`}
                className="flex items-center gap-1"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onSelect(connection.node.id)}
                >
                  {connection.node.label}
                </Button>
                {connection.charter && (
                  <span className="text-xs text-muted-foreground">
                    {t.rich('statedIn', {
                      name: connection.charter.label,
                      charter: (chunks) => (
                        <button
                          type="button"
                          className="underline underline-offset-2 hover:text-foreground"
                          onClick={() => onSelect(connection.charter!.id)}
                        >
                          {chunks}
                        </button>
                      ),
                    })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SelectedNode({
  index,
  node,
  onSelect,
}: {
  index: NetworkIndex;
  node: NetworkNode;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations('network');
  const hood = useMemo(() => neighbourhood(index, node.id, MAX_DRAWN), [index, node.id]);
  const href = nodeHref(node);

  return (
    <article aria-labelledby="network-selected" className="rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{t(`kind.${node.kind}`)}</Badge>
        <span className="text-xs text-muted-foreground">
          {t('connections', { count: degree(index, node.id) })}
        </span>
      </div>
      <h2 id="network-selected" className="mt-2 text-xl font-semibold" tabIndex={-1}>
        {node.label}
      </h2>
      {href && (
        <Link
          href={href}
          className="mt-1 inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          {t('open', { kind: node.kind })}
        </Link>
      )}

      <figure className="mt-4">
        <NetworkDrawing index={index} hood={hood} onSelect={onSelect} />
        <figcaption className="mt-2 space-y-1 text-sm text-muted-foreground">
          <p>
            {t('drawingCaption', {
              name: node.label,
              inner: hood.inner.length,
              outer: hood.outer.length,
            })}
          </p>
          {hood.omitted > 0 && <p>{t('omitted', { count: hood.omitted })}</p>}
          <Legend />
        </figcaption>
      </figure>

      <div className="mt-6">
        <ConnectionList connections={index.connections.get(node.id) ?? []} onSelect={onSelect} />
      </div>
    </article>
  );
}

function NodeIndex({
  index,
  selected,
  onSelect,
}: {
  index: NetworkIndex;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations('network');
  const [kind, setKind] = useState<string>(ALL);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(INDEX_PAGE);
  const ranked = useMemo(
    () => rankNodes(index, kind === ALL ? null : (kind as NetworkKind), query),
    [index, kind, query]
  );

  return (
    <nav aria-label={t('indexLabel')} className="space-y-3">
      <Segmented<string>
        ariaLabel={t('kindLabel')}
        value={kind}
        options={[
          { value: ALL, label: t('all') },
          ...NETWORK_KINDS.map((value) => ({ value, label: t(`kinds.${value}`) })),
        ]}
        onChange={(next) => {
          setKind(next);
          setShown(INDEX_PAGE);
        }}
      />
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          aria-label={t('searchLabel')}
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setShown(INDEX_PAGE);
          }}
          className="pl-8"
        />
      </div>
      {ranked.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noMatch')}</p>
      ) : (
        <ul className="max-h-[36rem] space-y-0.5 overflow-y-auto">
          {ranked.slice(0, shown).map((node) => (
            <li key={node.id}>
              <button
                type="button"
                aria-current={node.id === selected ? 'true' : undefined}
                onClick={() => onSelect(node.id)}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-muted aria-[current=true]:bg-muted aria-[current=true]:font-medium"
              >
                <svg viewBox="-9 -9 18 18" className="h-3 w-3 shrink-0" aria-hidden="true">
                  <NodeShape kind={node.kind} size={6} />
                </svg>
                <span className="min-w-0 flex-1 truncate">{node.label}</span>
                <span className="text-xs text-muted-foreground">
                  <span className="sr-only">{t(`kind.${node.kind}`)}, </span>
                  {t('connections', { count: degree(index, node.id) })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {ranked.length > shown && (
        <Button variant="ghost" size="sm" onClick={() => setShown((count) => count + INDEX_PAGE)}>
          {t('showMore')}
        </Button>
      )}
    </nav>
  );
}

function nodeInUrl(): string | null {
  return new URLSearchParams(window.location.search).get('node');
}

export function NetworkExplorer({ initialNode = null }: { initialNode?: string | null }) {
  const t = useTranslations('network');
  const { data, isError, refetch } = useQuery({ queryKey: NETWORK_KEY, queryFn: getNetwork });
  const index = useMemo(() => (data ? indexNetwork(data) : null), [data]);
  const [chosen, setChosen] = useState<string | null>(initialNode);

  useEffect(() => {
    const onPop = () => setChosen(nodeInUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const selected =
    index && chosen && index.nodes.has(chosen) ? chosen : index ? startingNode(index) : null;
  const select = (id: string) => {
    setChosen(id);
    if (nodeInUrl() !== id) window.history.pushState(null, '', `?node=${encodeURIComponent(id)}`);
    document.getElementById('network-selected')?.focus({ preventScroll: true });
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <header className="flex items-start gap-3">
        <Network className="mt-1 h-7 w-7 shrink-0 text-primary" aria-hidden />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">{t('intro')}</p>
        </div>
      </header>

      <p className="mt-6 flex max-w-4xl gap-2 rounded-md border bg-muted/40 px-4 py-3 text-sm">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        {t('provenance')}
      </p>

      <div className="mt-6" aria-busy={!data && !isError}>
        {isError ? (
          <div className="rounded-lg border px-5 py-4" role="alert">
            <p>{t('loadError')}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              {t('retry')}
            </Button>
          </div>
        ) : index && selected === null ? (
          <div className="rounded-lg border px-5 py-6 text-center">
            <p className="font-medium">{t('empty')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('emptyHint')}</p>
          </div>
        ) : index && selected ? (
          <>
            <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <a
                href={NETWORK_GEXF_URL}
                download
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
              >
                <Download className="h-4 w-4" aria-hidden />
                {t('download')}
              </a>
              <span className="text-muted-foreground">{t('downloadHint')}</span>
            </p>
            <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
              <NodeIndex index={index} selected={selected} onSelect={select} />
              <SelectedNode index={index} node={index.nodes.get(selected)!} onSelect={select} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
