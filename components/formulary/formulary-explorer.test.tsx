/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FormularyExplorer } from './formulary-explorer';
import { renderWithQueryClient } from '@/test/render';
import type { Formula, FormulaOccurrence } from '@/types/diplomatic';

const services = vi.hoisted(() => ({ getFormulae: vi.fn() }));
vi.mock('@/services/diplomatic', () => services);

function occurrence(n: number, overrides: Partial<FormulaOccurrence['charter']> = {}) {
  return {
    id: n,
    image_text: 500 + n,
    excerpt: `presens scriptum sigilli mei appositione roboraui ${n}`,
    charter: {
      image_text: 500 + n,
      type: 'Transcription',
      item_image: 7000 + n,
      item_part: 700 + n,
      locus: 'face',
      shelfmark: `GD55/${n}`,
      repository: 'National Records of Scotland',
      date: '1193',
      ...overrides,
    },
  };
}

function formula(id: number, overrides: Partial<Formula> = {}): Formula {
  const occurrences = [occurrence(1)];
  return {
    id,
    kind: 'corroboratio',
    label: 'Sealing with the granter’s seal',
    exemplar: 'sigilli mei appositione roboraui',
    published_type: 'Corroboratio 2',
    occurrence_count: occurrences.length,
    occurrences,
    created: '2026-11-04T00:00:00Z',
    ...overrides,
  };
}

const page = (results: Formula[], count = results.length) => ({
  count,
  next: null,
  previous: null,
  results,
});

const cards = () => screen.getAllByRole('article');

describe('<FormularyExplorer>', () => {
  beforeEach(() => services.getFormulae.mockReset());

  it('shows each formula with its kind, its wording and where it stands in the typology', async () => {
    services.getFormulae.mockResolvedValue(
      page([
        formula(1),
        formula(2, {
          kind: 'sanctio',
          label: 'Curse',
          exemplar: 'anathema sit',
          published_type: '',
        }),
      ])
    );
    renderWithQueryClient(<FormularyExplorer />);

    expect(await screen.findByText('2 formulae')).not.toBeNull();
    expect(services.getFormulae).toHaveBeenCalledWith({
      kind: undefined,
      search: undefined,
      limit: 20,
      offset: 0,
    });
    const [sealing, curse] = cards();
    expect(within(sealing).getByText('Corroboratio')).not.toBeNull();
    expect(within(sealing).getByText('Published type: Corroboratio 2')).not.toBeNull();
    expect(within(sealing).getByText('sigilli mei appositione roboraui').getAttribute('lang')).toBe(
      'la'
    );
    expect(within(curse).getByText('Not in the published typology')).not.toBeNull();
  });

  it('lists the charters that use it, with where to read and see each', async () => {
    services.getFormulae.mockResolvedValue(page([formula(1)]));
    renderWithQueryClient(<FormularyExplorer />);

    const card = (await screen.findAllByRole('article'))[0];
    expect(within(card).getByText('Found in 1 charter')).not.toBeNull();
    const row = within(card).getByRole('listitem');
    expect(row.textContent).toContain('GD55/1, face');
    expect(row.textContent).toContain('National Records of Scotland · 1193');
    expect(
      within(row).getByRole('link', { name: 'Read the transcription' }).getAttribute('href')
    ).toBe('/manuscripts/701/images/7001/texts/501');
    expect(within(row).getByRole('link', { name: 'Open the folio' }).getAttribute('href')).toBe(
      '/manuscripts/701/images/7001'
    );
  });

  it('shows five charters of a common formula, and the rest on request', async () => {
    const many = Array.from({ length: 8 }, (_, i) => occurrence(i + 1));
    services.getFormulae.mockResolvedValue(
      page([formula(1, { occurrences: many, occurrence_count: 8 })])
    );
    renderWithQueryClient(<FormularyExplorer />);

    const card = (await screen.findAllByRole('article'))[0];
    expect(within(card).getAllByRole('listitem')).toHaveLength(5);

    fireEvent.click(within(card).getByRole('button', { name: 'Show all 8' }));
    expect(within(card).getAllByRole('listitem')).toHaveLength(8);
    expect(
      within(card).getByRole('button', { name: 'Show fewer' }).getAttribute('aria-expanded')
    ).toBe('true');
  });

  it('names a charter without a shelfmark as such', async () => {
    services.getFormulae.mockResolvedValue(
      page([formula(1, { occurrences: [occurrence(1, { shelfmark: '' })] })])
    );
    renderWithQueryClient(<FormularyExplorer />);

    expect(await screen.findByText('Unnamed record')).not.toBeNull();
  });

  it('filters by kind from the first page', async () => {
    services.getFormulae.mockResolvedValue(page([formula(1)], 45));
    renderWithQueryClient(<FormularyExplorer />);
    await screen.findByText('45 formulae');
    fireEvent.click(screen.getByRole('button', { name: /^(Go to )?page 2$/i }));
    await waitFor(() =>
      expect(services.getFormulae).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 20 }))
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Sanctio' }));

    await waitFor(() =>
      expect(services.getFormulae).toHaveBeenLastCalledWith({
        kind: 'sanctio',
        search: undefined,
        limit: 20,
        offset: 0,
      })
    );
  });

  it('searches by wording once typing pauses', async () => {
    services.getFormulae.mockResolvedValue(page([formula(1)]));
    renderWithQueryClient(<FormularyExplorer />);
    await screen.findByText('1 formula');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search the formulary' }), {
      target: { value: ' sigilli ' },
    });

    await waitFor(() =>
      expect(services.getFormulae).toHaveBeenLastCalledWith({
        kind: undefined,
        search: 'sigilli',
        limit: 20,
        offset: 0,
      })
    );
  });

  it('pages through a long formulary', async () => {
    services.getFormulae.mockResolvedValue(page([formula(1)], 45));
    renderWithQueryClient(<FormularyExplorer />);
    await screen.findByText('45 formulae');

    fireEvent.click(screen.getByRole('button', { name: /^(Go to )?page 2$/i }));

    await waitFor(() =>
      expect(services.getFormulae).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 20, limit: 20 })
      )
    );
  });

  it('says nothing has been approved yet, and how things get here', async () => {
    services.getFormulae.mockResolvedValue(page([]));
    renderWithQueryClient(<FormularyExplorer />);

    expect(await screen.findByText('No formula has been approved yet.')).not.toBeNull();
    expect(screen.getByText(/once a scholar has reviewed/)).not.toBeNull();
  });

  it('says nothing matches when a filter finds nothing', async () => {
    services.getFormulae.mockResolvedValueOnce(page([formula(1)])).mockResolvedValue(page([]));
    renderWithQueryClient(<FormularyExplorer />);
    await screen.findByText('1 formula');

    fireEvent.click(screen.getByRole('radio', { name: 'Sanctio' }));

    expect(await screen.findByText('No formula matches.')).not.toBeNull();
    expect(screen.queryByText('No formula has been approved yet.')).toBeNull();
  });

  it('says so when the formulary cannot be loaded, and can try again', async () => {
    services.getFormulae
      .mockRejectedValueOnce(new Error('500'))
      .mockResolvedValue(page([formula(1)]));
    renderWithQueryClient(<FormularyExplorer />);

    expect(await screen.findByText('Could not load the formulary.')).not.toBeNull();
    expect(screen.queryByText('No formula has been approved yet.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('1 formula')).not.toBeNull();
  });
});
