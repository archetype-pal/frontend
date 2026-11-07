import { describe, expect, it } from 'vitest';

import {
  connectionKey,
  degree,
  groupConnections,
  indexNetwork,
  neighbourhood,
  nodeHref,
  radialLayout,
  rankNodes,
  startingNode,
} from './network';
import type { DiplomaticNetwork, NetworkEdge, NetworkKind, NetworkNode } from '@/types/diplomatic';

const node = (
  id: string,
  label: string,
  kind: NetworkKind,
  record: number | null = null
): NetworkNode => ({
  id,
  label,
  kind,
  record,
});
const edge = (source: string, target: string, relation: string, charter = ''): NetworkEdge => ({
  source,
  target,
  relation,
  charter,
});

/** Two charters granted by David; Walterus witnesses both, Hugo one; a scribe wrote the first. */
const NETWORK: DiplomaticNetwork = {
  nodes: [
    node('person:david', 'David rex', 'person'),
    node('person:walterus', 'Walterus', 'person'),
    node('person:hugo', 'Hugo', 'person'),
    node('person:monks', 'Monachis de Kelchou', 'person'),
    node('place:edinburgh', 'Edinburgh', 'place'),
    node('charter:1', 'GD55/1', 'charter', 1),
    node('charter:2', 'GD55/2', 'charter', 2),
    node('scribe:7', 'Scribe Ab', 'scribe', 7),
  ],
  edges: [
    edge('person:david', 'charter:1', 'granter'),
    edge('person:david', 'charter:2', 'granter'),
    edge('person:walterus', 'charter:1', 'witness'),
    edge('person:walterus', 'charter:2', 'witness'),
    edge('person:hugo', 'charter:2', 'witness'),
    edge('charter:1', 'place:edinburgh', 'located_at'),
    edge('scribe:7', 'charter:1', 'scribe'),
    edge('person:monks', 'person:david', 'beneficiary_of', 'charter:1'),
  ],
};

const index = indexNetwork(NETWORK);
const labels = (ids: string[]) => ids.map((id) => index.nodes.get(id)!.label);

describe('indexNetwork', () => {
  it('lists each connection from both ends, with the charter a statement is made in', () => {
    const monks = index.connections.get('person:monks')!;
    const david = index.connections
      .get('person:david')!
      .filter((c) => c.node.id === 'person:monks');

    expect(monks).toEqual([
      expect.objectContaining({
        relation: 'beneficiary_of',
        outgoing: true,
        charter: index.nodes.get('charter:1'),
      }),
    ]);
    expect(david).toEqual([
      expect.objectContaining({ relation: 'beneficiary_of', outgoing: false }),
    ]);
  });

  it('skips an edge to a node it was not given', () => {
    const partial = indexNetwork({
      nodes: [node('person:a', 'A', 'person')],
      edges: [edge('person:a', 'charter:9', 'witness')],
    });

    expect(partial.connections.get('person:a')).toEqual([]);
  });
});

describe('degree and rankNodes', () => {
  it('counts distinct neighbours, not edges', () => {
    const twice = indexNetwork({
      nodes: [node('person:a', 'A', 'person'), node('charter:1', 'C', 'charter', 1)],
      edges: [edge('person:a', 'charter:1', 'witness'), edge('person:a', 'charter:1', 'granter')],
    });

    expect(degree(twice, 'person:a')).toBe(1);
  });

  it('puts the most connected first, then by name', () => {
    expect(labels(rankNodes(index, null, '').map((n) => n.id)).slice(0, 4)).toEqual([
      'GD55/1',
      'David rex',
      'GD55/2',
      'Walterus',
    ]);
  });

  it('narrows by kind and by a name, ignoring case and spacing', () => {
    expect(rankNodes(index, 'scribe', '').map((n) => n.label)).toEqual(['Scribe Ab']);
    expect(rankNodes(index, null, '  KELCHOU ').map((n) => n.label)).toEqual([
      'Monachis de Kelchou',
    ]);
    expect(rankNodes(index, 'place', 'walter')).toEqual([]);
  });
});

describe('startingNode', () => {
  it('opens on the most connected person rather than a busier charter', () => {
    expect(startingNode(index)).toBe('person:david');
  });

  it('opens on any node when nobody is named, and on nothing in an empty network', () => {
    const charters = indexNetwork({
      nodes: [node('charter:1', 'C', 'charter', 1), node('scribe:1', 'S', 'scribe', 1)],
      edges: [edge('scribe:1', 'charter:1', 'scribe')],
    });

    expect(startingNode(charters)).toBe('charter:1');
    expect(startingNode(indexNetwork({ nodes: [], edges: [] }))).toBeNull();
  });
});

describe('neighbourhood', () => {
  it('rings the direct connections, then theirs, people first and by name', () => {
    const hood = neighbourhood(index, 'person:walterus');

    expect(labels(hood.inner)).toEqual(['GD55/1', 'GD55/2']);
    expect(labels(hood.outer)).toEqual(['David rex', 'Hugo', 'Edinburgh', 'Scribe Ab']);
    expect(hood.omitted).toBe(0);
  });

  it('draws only the edges among the nodes it shows, each once', () => {
    const hood = neighbourhood(index, 'scribe:7');
    const drawn = new Set([hood.centre, ...hood.inner, ...hood.outer]);

    expect(labels([...drawn].sort())).toEqual([
      'GD55/1',
      'David rex',
      'Walterus',
      'Edinburgh',
      'Scribe Ab',
    ]);
    expect(hood.edges.every((e) => drawn.has(e.source) && drawn.has(e.target))).toBe(true);
    expect(hood.edges).toHaveLength(4);
    expect(new Set(hood.edges.map((e) => JSON.stringify(e))).size).toBe(hood.edges.length);
  });

  it('draws a statement between two people with the charter that makes it', () => {
    expect(neighbourhood(index, 'person:david').edges).toContainEqual(
      edge('person:monks', 'person:david', 'beneficiary_of', 'charter:1')
    );
  });

  it('leaves out the outer ring when it does not fit, and says how many', () => {
    const hood = neighbourhood(index, 'person:walterus', 4);

    expect(hood.inner).toHaveLength(2);
    expect(hood.outer).toEqual([]);
    expect(hood.omitted).toBe(4);
  });

  it('cuts the inner ring to the room there is', () => {
    const hood = neighbourhood(index, 'charter:1', 3);

    expect(hood.inner).toHaveLength(2);
    expect(hood.omitted).toBe(5 - 2 + 1);
  });
});

describe('radialLayout', () => {
  const distance = (p: { x: number; y: number }) => Math.hypot(p.x, p.y);

  it('puts the node at the centre, its connections on one ring and theirs on a wider one', () => {
    const hood = neighbourhood(index, 'person:walterus');
    const positions = radialLayout(index, hood);

    expect(positions.get('person:walterus')).toEqual({ x: 0, y: 0 });
    const inner = hood.inner.map((id) => distance(positions.get(id)!));
    const outer = hood.outer.map((id) => distance(positions.get(id)!));
    expect(Math.max(...inner) - Math.min(...inner)).toBeLessThan(1e-9);
    expect(Math.min(...outer)).toBeGreaterThan(Math.max(...inner));
  });

  it('never puts two nodes in one place', () => {
    const positions = [...radialLayout(index, neighbourhood(index, 'person:david')).values()];
    const keys = positions.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('places an outer node on the side of the inner node it hangs from', () => {
    const hood = neighbourhood(index, 'person:walterus');
    const positions = radialLayout(index, hood);
    const angle = (id: string) => Math.atan2(positions.get(id)!.y, positions.get(id)!.x);
    const apart = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

    // Hugo witnesses only the second charter; the scribe wrote only the first.
    expect(apart(angle('person:hugo'), angle('charter:2'))).toBeLessThan(
      apart(angle('person:hugo'), angle('charter:1'))
    );
    expect(apart(angle('scribe:7'), angle('charter:1'))).toBeLessThan(
      apart(angle('scribe:7'), angle('charter:2'))
    );
  });
});

describe('nodeHref', () => {
  it('opens a charter at its item part and a scribe at its page; a name read in a text has none', () => {
    expect(nodeHref(index.nodes.get('charter:1')!)).toBe('/manuscripts/1');
    expect(nodeHref(index.nodes.get('scribe:7')!)).toBe('/scribes/7');
    expect(nodeHref(index.nodes.get('person:david')!)).toBeNull();
  });
});

describe('groupConnections', () => {
  it('lists one name once, however many times a charter repeats it', () => {
    const repeated = indexNetwork({
      nodes: [node('charter:1', 'A charter', 'charter'), node('person:w', 'Willelmus', 'person')],
      edges: [edge('person:w', 'charter:1', 'witness'), edge('person:w', 'charter:1', 'witness')],
    });

    const [[, items]] = groupConnections(repeated.connections.get('charter:1')!) as [
      [string, unknown[]],
    ];

    expect(items).toHaveLength(1);
  });

  it('phrases a connection from the side it is seen from, and a statement apart from a role', () => {
    const [toCharter] = index.connections.get('person:hugo')!;
    const [fromPerson] = index.connections
      .get('charter:2')!
      .filter((c) => c.node.id === 'person:hugo');
    const [statement] = index.connections.get('person:monks')!;

    expect(connectionKey(toCharter!)).toBe('link.witness.out');
    expect(connectionKey(fromPerson!)).toBe('link.witness.in');
    expect(connectionKey(statement!)).toBe('statement.beneficiary_of.out');
  });

  it('lists a charter’s connections in the order a charter names them', () => {
    const groups = groupConnections(index.connections.get('charter:1')!);

    expect(groups.map(([key, items]) => [key, items.map((c) => c.node.label)])).toEqual([
      ['link.granter.in', ['David rex']],
      ['link.witness.in', ['Walterus']],
      ['link.scribe.in', ['Scribe Ab']],
      ['link.located_at.out', ['Edinburgh']],
    ]);
  });

  it('lists roles before statements, and an unknown relation last', () => {
    const odd = indexNetwork({
      nodes: [
        node('person:a', 'A', 'person'),
        node('person:b', 'B', 'person'),
        node('charter:1', 'C', 'charter', 1),
      ],
      edges: [
        edge('person:a', 'person:b', 'married_to', 'charter:1'),
        edge('person:a', 'person:b', 'granted_by', 'charter:1'),
        edge('person:a', 'charter:1', 'witness'),
      ],
    });

    expect(groupConnections(odd.connections.get('person:a')!).map(([key]) => key)).toEqual([
      'link.witness.out',
      'statement.granted_by.out',
      'statement.married_to.out',
    ]);
  });
});
