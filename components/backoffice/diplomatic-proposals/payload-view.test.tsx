import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
    expect(screen.getByText('Not in the published typology')).not.toBeNull();
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
});
