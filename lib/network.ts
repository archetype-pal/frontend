/**
 * The network view's graph logic (AI programme W2.3), kept apart from React so
 * it can be tested on its own.
 *
 * The page never draws the whole network: a corpus-wide drawing is a tangle a
 * reader cannot follow, and the GEXF download is there for whole-graph work.
 * It draws one node's neighbourhood instead: the node at the centre, what it is
 * directly connected to on an inner ring, and what those connect to on an
 * outer ring, each placed near the ones it hangs from.
 */

import {
  NETWORK_KINDS,
  type DiplomaticNetwork,
  type NetworkEdge,
  type NetworkKind,
  type NetworkNode,
} from '@/types/diplomatic';

export const NETWORK_KEY = ['diplomatic-network'] as const;

/** More than this and the outer ring is left out; more on the inner ring are cut. */
export const MAX_DRAWN = 120;

/** One of a node's connections, seen from that node. */
export interface Connection {
  node: NetworkNode;
  relation: string;
  /** True when the edge leaves the node it is seen from. */
  outgoing: boolean;
  /** For a statement between two people, the charter that makes it. */
  charter: NetworkNode | null;
}

export interface NetworkIndex {
  nodes: Map<string, NetworkNode>;
  connections: Map<string, Connection[]>;
}

const KIND_RANK = new Map<string, number>(NETWORK_KINDS.map((kind, rank) => [kind, rank]));

function byKindThenLabel(a: NetworkNode, b: NetworkNode): number {
  return (
    (KIND_RANK.get(a.kind) ?? NETWORK_KINDS.length) -
      (KIND_RANK.get(b.kind) ?? NETWORK_KINDS.length) || a.label.localeCompare(b.label)
  );
}

export function indexNetwork(network: DiplomaticNetwork): NetworkIndex {
  const nodes = new Map(network.nodes.map((node) => [node.id, node]));
  const connections = new Map<string, Connection[]>(network.nodes.map((node) => [node.id, []]));
  for (const edge of network.edges) {
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source || !target) continue;
    const charter = edge.charter ? (nodes.get(edge.charter) ?? null) : null;
    connections
      .get(source.id)!
      .push({ node: target, relation: edge.relation, outgoing: true, charter });
    connections
      .get(target.id)!
      .push({ node: source, relation: edge.relation, outgoing: false, charter });
  }
  return { nodes, connections };
}

/** How many distinct nodes this one is connected to. */
export function degree(index: NetworkIndex, id: string): number {
  return new Set((index.connections.get(id) ?? []).map((connection) => connection.node.id)).size;
}

/** The index list: the most connected first, then by name. */
export function rankNodes(
  index: NetworkIndex,
  kind: NetworkKind | null,
  query: string
): NetworkNode[] {
  const needle = query.trim().toLocaleLowerCase();
  return [...index.nodes.values()]
    .filter(
      (node) =>
        (kind === null || node.kind === kind) && node.label.toLocaleLowerCase().includes(needle)
    )
    .map((node) => ({ node, degree: degree(index, node.id) }))
    .sort((a, b) => b.degree - a.degree || a.node.label.localeCompare(b.node.label))
    .map(({ node }) => node);
}

/** Where the page opens: the most connected person, or failing that the most connected node. */
export function startingNode(index: NetworkIndex): string | null {
  return (rankNodes(index, 'person', '')[0] ?? rankNodes(index, null, '')[0])?.id ?? null;
}

export interface Neighbourhood {
  centre: string;
  inner: string[];
  outer: string[];
  edges: NetworkEdge[];
  /** Connections that exist but are not drawn, for want of room. */
  omitted: number;
}

function neighbours(index: NetworkIndex, id: string): NetworkNode[] {
  const seen = new Map<string, NetworkNode>();
  for (const connection of index.connections.get(id) ?? [])
    seen.set(connection.node.id, connection.node);
  return [...seen.values()];
}

export function neighbourhood(index: NetworkIndex, centre: string, max = MAX_DRAWN): Neighbourhood {
  const allInner = neighbours(index, centre).sort(byKindThenLabel);
  const inner = allInner.slice(0, max - 1).map((node) => node.id);
  const drawn = new Set([centre, ...inner]);

  const outerNodes = new Map<string, NetworkNode>();
  for (const id of inner) {
    for (const node of neighbours(index, id))
      if (!drawn.has(node.id)) outerNodes.set(node.id, node);
  }
  const fits = drawn.size + outerNodes.size <= max;
  const outer = fits ? [...outerNodes.values()].sort(byKindThenLabel).map((node) => node.id) : [];
  for (const id of outer) drawn.add(id);

  const edges: NetworkEdge[] = [];
  const seen = new Set<string>();
  for (const id of drawn) {
    for (const connection of index.connections.get(id) ?? []) {
      if (!connection.outgoing || !drawn.has(connection.node.id)) continue;
      const key = `${id}\u0000${connection.node.id}\u0000${connection.relation}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({
        source: id,
        target: connection.node.id,
        relation: connection.relation,
        charter: connection.charter?.id ?? '',
      });
    }
  }

  return {
    centre,
    inner,
    outer,
    edges,
    omitted: allInner.length - inner.length + (fits ? 0 : outerNodes.size),
  };
}

export interface Point {
  x: number;
  y: number;
}

/** Room each node needs along its ring, in drawing units. */
const INNER_SPACING = 34;
const OUTER_SPACING = 18;
const MIN_INNER_RADIUS = 130;
const RING_GAP = 120;

function ring(count: number, spacing: number, minimum: number): number {
  return Math.max(minimum, (count * spacing) / (2 * Math.PI));
}

/**
 * The centre at the origin, the inner ring evenly round it, and the outer ring
 * in the order of the inner nodes each hangs from, so a charter's witnesses sit
 * beside it rather than across the drawing.
 */
export function radialLayout(index: NetworkIndex, hood: Neighbourhood): Map<string, Point> {
  const positions = new Map<string, Point>([[hood.centre, { x: 0, y: 0 }]]);
  const innerRadius = ring(hood.inner.length, INNER_SPACING, MIN_INNER_RADIUS);
  const angles = new Map<string, number>();
  hood.inner.forEach((id, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / hood.inner.length;
    angles.set(id, angle);
    positions.set(id, { x: innerRadius * Math.cos(angle), y: innerRadius * Math.sin(angle) });
  });

  const outerRadius = ring(hood.outer.length, OUTER_SPACING, innerRadius + RING_GAP);
  const targets = hood.outer.map((id) => {
    // The circular mean of the angles of the inner nodes it connects to.
    let x = 0;
    let y = 0;
    for (const connection of index.connections.get(id) ?? []) {
      const angle = angles.get(connection.node.id);
      if (angle === undefined) continue;
      x += Math.cos(angle);
      y += Math.sin(angle);
    }
    return { id, angle: Math.atan2(y, x) };
  });
  targets.sort((a, b) => a.angle - b.angle || a.id.localeCompare(b.id));
  // Evenly spaced in that order, so none overlap, and the whole ring turned to
  // where its nodes are best beside their parents: the circular mean of how far
  // each target lies from its slot.
  const slot = (i: number) => (2 * Math.PI * i) / targets.length;
  let sin = 0;
  let cos = 0;
  targets.forEach(({ angle }, i) => {
    sin += Math.sin(angle - slot(i));
    cos += Math.cos(angle - slot(i));
  });
  const turn = Math.atan2(sin, cos);
  targets.forEach(({ id }, i) => {
    const angle = turn + slot(i);
    positions.set(id, { x: outerRadius * Math.cos(angle), y: outerRadius * Math.sin(angle) });
  });

  return positions;
}

/** Where a node's own page is: a charter's item part, a scribe. A name read in a text has none. */
export function nodeHref(node: NetworkNode): string | null {
  if (node.record === null) return null;
  if (node.kind === 'charter') return `/manuscripts/${node.record}`;
  if (node.kind === 'scribe') return `/scribes/${node.record}`;
  return null;
}

/** The message key under which a connection is listed, from the side it is seen from. */
export function connectionKey(connection: Connection): string {
  const family = connection.charter ? 'statement' : 'link';
  return `${family}.${connection.relation}.${connection.outgoing ? 'out' : 'in'}`;
}

/** The order a charter names them in: who grants, to whom, before whom, who wrote it, where. */
const RELATION_ORDER = [
  'granter',
  'beneficiary',
  'witness',
  'scribe',
  'located_at',
  'granted_by',
  'beneficiary_of',
  'witnessed_by',
  'written_by',
];

function groupRank(connection: Connection): number[] {
  const relation = RELATION_ORDER.indexOf(connection.relation);
  return [
    connection.charter ? 1 : 0,
    relation === -1 ? RELATION_ORDER.length : relation,
    connection.outgoing ? 0 : 1,
  ];
}

function compareRanks(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return 0;
}

/** A node's connections grouped by how they read, in the order a charter reads. */
export function groupConnections(connections: Connection[]): [string, Connection[]][] {
  const groups = new Map<string, { rank: number[]; items: Connection[] }>();
  for (const connection of connections) {
    const key = connectionKey(connection);
    const group = groups.get(key) ?? { rank: groupRank(connection), items: [] };
    group.items.push(connection);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .sort(([a, x], [b, y]) => compareRanks(x.rank, y.rank) || a.localeCompare(b))
    .map(([key, { items }]): [string, Connection[]] => [
      key,
      items.sort((a, b) => byKindThenLabel(a.node, b.node)),
    ]);
}
