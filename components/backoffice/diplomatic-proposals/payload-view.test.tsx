import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PayloadView } from './payload-view';

const TEXT = 'W. miseratione diuina . eternam in domino Salutem . Hiis testibus . Dauid de Bernham';

describe('<PayloadView>', () => {
  it('shows each formula with its kind, its excerpt checked, and whether the typology has it', () => {
    render(
      <PayloadView
        pipeline="W2.2"
        text={TEXT}
        catalogueDate=""
        payload={{
          formulae: [
            {
              kind: 'salutation',
              label: 'Eternal greeting',
              excerpt: 'eternam in domino Salutem',
              published_type: 'Salutatio B',
            },
            { kind: 'sanctio', label: 'Curse', excerpt: 'anathema sit', published_type: '' },
          ],
        }}
      />
    );

    expect(screen.getByText('Salutation')).not.toBeNull();
    expect(screen.getByText('Published type: Salutatio B')).not.toBeNull();
    expect(screen.getByText('No published type')).not.toBeNull();
    expect(screen.getAllByText('In the text')).toHaveLength(1);
    expect(screen.getAllByText('Not in the text')).toHaveLength(1);
  });

  it('shows a dating flag against the catalogue date, checking each quoted fragment', () => {
    render(
      <PayloadView
        pipeline="W3.2"
        text={TEXT}
        catalogueDate="22 July 1211 X 1232"
        payload={{
          verdict: 'inconsistent',
          evidence: 'Witnessed by "Dauid de Bernham" and "Hugone cancellario".',
          reasoning: 'David became bishop in 1239.',
          suggested_range: '1233 × 1239',
        }}
      />
    );

    expect(screen.getByText('Inconsistent with its date')).not.toBeNull();
    expect(screen.getByText('Catalogue date: 22 July 1211 X 1232')).not.toBeNull();
    expect(screen.getByText('“Dauid de Bernham”').parentElement?.textContent).toContain(
      'In the text'
    );
    expect(screen.getByText('“Hugone cancellario”').parentElement?.textContent).toContain(
      'Not in the text'
    );
    expect(screen.getByText('1233 × 1239')).not.toBeNull();
  });

  it('shows a translation and its noted uncertainties, with nothing to check', () => {
    render(
      <PayloadView
        pipeline="W2.4"
        text={TEXT}
        catalogueDate=""
        payload={{ translation: 'W., by divine mercy…', notes: '‘diuina’ read as ‘divina’.' }}
      />
    );

    expect(screen.getByText('W., by divine mercy…')).not.toBeNull();
    expect(screen.getByText('Noted uncertainties')).not.toBeNull();
    expect(screen.queryByText('In the text')).toBeNull();
    expect(screen.queryByText('Not in the text')).toBeNull();
  });

  it('marks nothing until the text has loaded', () => {
    render(
      <PayloadView
        pipeline="W2.1"
        text={null}
        catalogueDate=""
        payload={{ entities: [{ role: 'witness', name: 'Dauid de Bernham' }] }}
      />
    );

    expect(screen.getByText('Dauid de Bernham')).not.toBeNull();
    expect(screen.queryByText('In the text')).toBeNull();
    expect(screen.queryByText('Not in the text')).toBeNull();
  });

  it('shows a value outside the vocabulary as it came, and an unknown pipeline as JSON', () => {
    const { container } = render(
      <PayloadView
        pipeline="W9.9"
        text={TEXT}
        catalogueDate=""
        payload={{ anything: ['at', 'all'] }}
      />
    );
    expect(container.querySelector('pre')?.textContent).toContain('"anything"');

    render(
      <PayloadView
        pipeline="W2.1"
        text={TEXT}
        catalogueDate=""
        payload={{ entities: [{ role: 'scribe', name: 'Dauid de Bernham' }] }}
      />
    );
    expect(screen.getByText('scribe')).not.toBeNull();
  });

  describe('choosing items', () => {
    const ENTITIES = {
      entities: [
        { role: 'witness', name: 'Dauid de Bernham' },
        { role: 'granter', name: 'W.' },
      ],
    };
    const box = (name: string) => screen.getByRole('checkbox', { name });

    it('ticks each item by its position in the model’s list, though entities show by role', () => {
      const onToggle = vi.fn();
      render(
        <PayloadView
          pipeline="W2.1"
          text={TEXT}
          catalogueDate=""
          payload={ENTITIES}
          choice={{ chosen: new Set([0]), onToggle }}
        />
      );

      const boxes = screen.getAllByRole('checkbox');
      expect(boxes.map((b) => b.getAttribute('aria-label'))).toEqual([
        'Record Granter: W.',
        'Record Witness: Dauid de Bernham',
      ]);
      expect(box('Record Witness: Dauid de Bernham').getAttribute('aria-checked')).toBe('true');
      expect(box('Record Granter: W.').getAttribute('aria-checked')).toBe('false');
      expect(box('Record Granter: W.').closest('li')?.className).toContain('opacity-60');
      expect(box('Record Witness: Dauid de Bernham').closest('li')?.className).not.toContain(
        'opacity-60'
      );

      fireEvent.click(box('Record Granter: W.'));
      expect(onToggle).toHaveBeenCalledWith(1);
      // A pending choice is not yet a decision.
      expect(screen.queryByText('Left out')).toBeNull();
    });

    it('names formulae and relations by what they say', () => {
      const choice = { chosen: new Set([0]), onToggle: () => {} };
      render(
        <PayloadView
          pipeline="W2.2"
          text={TEXT}
          catalogueDate=""
          payload={{ formulae: [{ kind: 'salutation', label: 'Eternal greeting', excerpt: '' }] }}
          choice={choice}
        />
      );
      render(
        <PayloadView
          pipeline="W3.3"
          text={TEXT}
          catalogueDate=""
          payload={{
            triples: [{ subject: 'Dauid de Bernham', predicate: 'witnessed_by', object: 'W.' }],
          }}
          choice={choice}
        />
      );

      expect(box('Record Salutation: Eternal greeting')).not.toBeNull();
      expect(box('Record Dauid de Bernham – witnessed by – W.')).not.toBeNull();
    });

    it('marks what an accepted proposal left out, and offers no checkboxes', () => {
      render(
        <PayloadView
          pipeline="W2.1"
          text={TEXT}
          catalogueDate=""
          payload={ENTITIES}
          dropped={[0]}
        />
      );

      expect(screen.queryByRole('checkbox')).toBeNull();
      const leftOut = screen.getAllByText('Left out');
      expect(leftOut).toHaveLength(1);
      expect(leftOut[0].closest('li')?.textContent).toContain('Dauid de Bernham');
      expect(leftOut[0].closest('li')?.className).toContain('opacity-60');
    });
  });
});
