/** @vitest-environment jsdom */
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NetworkExplorer } from './network-explorer';
import { renderWithQueryClient } from '@/test/render';
import type { DiplomaticNetwork, NetworkEdge, NetworkKind, NetworkNode } from '@/types/diplomatic';

const services = vi.hoisted(() => ({
  getNetwork: vi.fn(),
  NETWORK_GEXF_URL: 'http://api.test/api/v1/diplomatic/network/gexf/',
}));
vi.mock('@/services/diplomatic', () => services);

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

const NETWORK: DiplomaticNetwork = {
  nodes: [
    node('person:david', 'David rex', 'person'),
    node('person:walterus', 'Walterus', 'person'),
    node('person:monks', 'Monachis de Kelchou', 'person'),
    node('place:edinburgh', 'Edinburgh', 'place'),
    node('charter:1', 'GD55/1', 'charter', 23),
    node('charter:2', 'GD55/2', 'charter', 24),
    node('scribe:7', 'Scribe Ab', 'scribe', 7),
  ],
  edges: [
    edge('person:david', 'charter:1', 'granter'),
    edge('person:david', 'charter:2', 'granter'),
    edge('person:walterus', 'charter:1', 'witness'),
    edge('person:monks', 'charter:1', 'beneficiary'),
    edge('charter:1', 'place:edinburgh', 'located_at'),
    edge('scribe:7', 'charter:1', 'scribe'),
    edge('person:monks', 'person:david', 'beneficiary_of', 'charter:2'),
  ],
};

const heading = () => screen.getByRole('heading', { level: 2 });
const index = () =>
  screen.getByRole('navigation', { name: 'Everyone and everything in the network' });
const indexEntries = () =>
  within(index())
    .getAllByRole('button')
    .filter((button) => button.closest('li'))
    .map((button) => button.textContent);
const choose = (label: string) =>
  fireEvent.click(within(index()).getByRole('button', { name: new RegExp(`^${label}`) }));
const group = (phrase: string) =>
  screen.getByRole('heading', { level: 3, name: phrase }).closest('section') as HTMLElement;

describe('<NetworkExplorer>', () => {
  beforeEach(() => {
    services.getNetwork.mockReset();
    services.getNetwork.mockResolvedValue(NETWORK);
    window.history.replaceState(null, '', '/network');
  });

  it('opens on the most connected person and lists everything, most connected first', async () => {
    renderWithQueryClient(<NetworkExplorer />);

    await waitFor(() => expect(heading().textContent).toBe('David rex'));
    expect(indexEntries().slice(0, 3)).toEqual([
      'GD55/1Charter, 5 connections',
      'David rexPerson, 3 connections',
      'Monachis de KelchouPerson, 2 connections',
    ]);
    expect(
      within(index())
        .getByRole('button', { name: /^David rex/ })
        .getAttribute('aria-current')
    ).toBe('true');
  });

  it('opens on the node a link names, and on the default when the link is stale', async () => {
    const { unmount } = renderWithQueryClient(<NetworkExplorer initialNode="scribe:7" />);
    await waitFor(() => expect(heading().textContent).toBe('Scribe Ab'));
    unmount();

    renderWithQueryClient(<NetworkExplorer initialNode="person:nobody" />);
    await waitFor(() => expect(heading().textContent).toBe('David rex'));
  });

  it('lists a charter’s connections in words, in the order a charter reads, each one choosable', async () => {
    renderWithQueryClient(<NetworkExplorer initialNode="charter:1" />);
    await waitFor(() => expect(heading().textContent).toBe('GD55/1'));

    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Granted by',
      'In favour of',
      'Witnessed by',
      'Written by',
      'Places named',
    ]);
    fireEvent.click(within(group('Witnessed by')).getByRole('button', { name: 'Walterus' }));
    expect(heading().textContent).toBe('Walterus');
  });

  it('names the charter a statement between two people is made in, and opens it', async () => {
    renderWithQueryClient(<NetworkExplorer initialNode="person:monks" />);
    await waitFor(() => expect(heading().textContent).toBe('Monachis de Kelchou'));

    // The role and the statement read alike, so they share one heading.
    const statement = group('Beneficiary of');
    expect(
      within(statement)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(['GD55/1', 'David rexstated in GD55/2']);

    fireEvent.click(within(statement).getByRole('button', { name: 'GD55/2' }));
    expect(heading().textContent).toBe('GD55/2');
  });

  it('opens a charter at its item part and a scribe at its page; a name has nowhere to open', async () => {
    renderWithQueryClient(<NetworkExplorer initialNode="charter:1" />);
    await waitFor(() => expect(heading().textContent).toBe('GD55/1'));
    expect(screen.getByRole('link', { name: 'Open the charter' }).getAttribute('href')).toBe(
      '/manuscripts/23'
    );

    choose('Scribe Ab');
    expect(screen.getByRole('link', { name: 'Open the scribe' }).getAttribute('href')).toBe(
      '/scribes/7'
    );

    choose('Walterus');
    expect(screen.queryByRole('link', { name: /^Open/ })).toBeNull();
  });

  it('keeps the chosen node in the URL, takes focus to it, and goes back on Back', async () => {
    renderWithQueryClient(<NetworkExplorer />);
    await waitFor(() => expect(heading().textContent).toBe('David rex'));

    choose('GD55/1');
    expect(window.location.search).toBe('?node=charter%3A1');
    expect(document.activeElement).toBe(heading());

    choose('Edinburgh');
    expect(window.location.search).toBe('?node=place%3Aedinburgh');

    act(() => {
      window.history.back();
    });
    await waitFor(() => expect(heading().textContent).toBe('GD55/1'));
  });

  it('narrows the index by kind and by name', async () => {
    renderWithQueryClient(<NetworkExplorer />);
    await waitFor(() => expect(heading().textContent).toBe('David rex'));

    fireEvent.click(screen.getByRole('radio', { name: 'Places' }));
    expect(indexEntries()).toEqual(['EdinburghPlace, 1 connection']);

    fireEvent.click(screen.getByRole('radio', { name: 'All' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Find a name' }), {
      target: { value: 'KELCH' },
    });
    expect(indexEntries()).toEqual(['Monachis de KelchouPerson, 2 connections']);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Find a name' }), {
      target: { value: 'nobody' },
    });
    expect(screen.getByText('Nothing matches.')).not.toBeNull();
  });

  it('shows the index fifty at a time', async () => {
    const people = Array.from({ length: 60 }, (_, i) =>
      node(`person:p${i}`, `Person ${i}`, 'person')
    );
    services.getNetwork.mockResolvedValue({
      nodes: [node('charter:1', 'GD55/1', 'charter', 1), ...people],
      edges: people.map((person) => edge(person.id, 'charter:1', 'witness')),
    });
    renderWithQueryClient(<NetworkExplorer />);
    await waitFor(() => expect(indexEntries()).toHaveLength(50));

    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(indexEntries()).toHaveLength(61);
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
  });

  it('draws the neighbourhood, says what it shows, and a node in it can be chosen', async () => {
    renderWithQueryClient(<NetworkExplorer initialNode="scribe:7" />);
    await waitFor(() => expect(heading().textContent).toBe('Scribe Ab'));

    expect(
      screen.getByText(
        'Scribe Ab at the centre, with 1 direct connection and 4 more one step further.'
      )
    ).not.toBeNull();
    const drawing = screen.getByTestId('network-drawing');
    expect(drawing.getAttribute('aria-hidden')).toBe('true');
    const drawn = [...drawing.querySelectorAll('title')].map((title) => title.textContent);
    expect(drawn).toEqual([
      'Scribe Ab',
      'GD55/1',
      'David rex',
      'Monachis de Kelchou',
      'Walterus',
      'Edinburgh',
    ]);

    fireEvent.click(drawing.querySelectorAll('title')[1]!.parentElement!);
    expect(heading().textContent).toBe('GD55/1');
  });

  it('draws a node with no connections at the size of any other', async () => {
    const lone = { id: 'charter:9', label: 'A lone charter', kind: 'charter' as const, record: 9 };
    services.getNetwork.mockResolvedValue({ ...NETWORK, nodes: [...NETWORK.nodes, lone] });
    renderWithQueryClient(<NetworkExplorer initialNode={lone.id} />);
    await waitFor(() => expect(heading().textContent).toBe(lone.label));

    const drawing = screen.getByTestId('network-drawing');
    const width = Number(drawing.getAttribute('viewBox')!.split(' ')[2]);

    expect(width).toBeGreaterThanOrEqual(480);
  });

  it('says how many connections are left out of a crowded drawing', async () => {
    const people = Array.from({ length: 130 }, (_, i) =>
      node(`person:p${i}`, `Person ${i}`, 'person')
    );
    services.getNetwork.mockResolvedValue({
      nodes: [node('charter:1', 'GD55/1', 'charter', 1), ...people],
      edges: people.map((person) => edge(person.id, 'charter:1', 'witness')),
    });
    renderWithQueryClient(<NetworkExplorer initialNode="charter:1" />);

    expect(
      await screen.findByText(
        '11 connections are not drawn, for want of room; all are listed below.'
      )
    ).not.toBeNull();
    expect(within(group('Witnessed by')).getAllByRole('button')).toHaveLength(130);
  });

  it('offers the whole network as a GEXF download', async () => {
    renderWithQueryClient(<NetworkExplorer />);

    const link = await screen.findByRole('link', { name: 'Download the network (GEXF)' });
    expect(link.getAttribute('href')).toBe(services.NETWORK_GEXF_URL);
  });

  it('says nothing has been approved yet, and how the network fills in', async () => {
    services.getNetwork.mockResolvedValue({ nodes: [], edges: [] });
    renderWithQueryClient(<NetworkExplorer />);

    expect(await screen.findByText('No connection has been approved yet.')).not.toBeNull();
    expect(screen.queryByRole('link', { name: /GEXF/ })).toBeNull();
  });

  it('says so when the network cannot be loaded, and can try again', async () => {
    services.getNetwork.mockReset();
    services.getNetwork.mockRejectedValueOnce(new Error('503')).mockResolvedValue(NETWORK);
    renderWithQueryClient(<NetworkExplorer />);

    expect(await screen.findByText('Could not load the network.')).not.toBeNull();
    expect(screen.queryByText('No connection has been approved yet.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(heading().textContent).toBe('David rex'));
  });
});
