/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderMsDescArea } from '@/lib/tei-msdesc-render';
import { manuscriptRefFromItemPart, placeRef, personRefFromScribe } from '@/lib/tei-ref-picker';
import type { ResourceRef } from '@/lib/tei-ref';
import { HistoryForm } from './history-form';
import { MsContentsForm } from './ms-contents-form';
import type { HistoryState, MsContentsState } from '@/lib/msdesc-form';

// Capture what MsKeyField hands the picker, and drive onPick synchronously.
let lastPickerProps: { kinds?: readonly string[]; onPick: (ref: ResourceRef) => void } | null =
  null;
vi.mock('@/components/backoffice/tei-ref-picker', () => ({
  TeiRefPicker: (props: { kinds?: readonly string[]; onPick: (ref: ResourceRef) => void }) => {
    lastPickerProps = props;
    return null;
  },
}));

const toastWarning = vi.fn();
vi.mock('sonner', () => ({ toast: { warning: (...a: unknown[]) => toastWarning(...a) } }));

import { MsKeyField, PERSON_ONLY } from './ms-key-field';

function renderKeyField(kinds?: readonly string[]) {
  const onChange = vi.fn();
  render(<MsKeyField label="Key" value="" onChange={onChange} kinds={kinds as never} />);
  return onChange;
}

describe('MsKeyField — only writes a key a picked resource actually has', () => {
  it('scopes the picker to Person by default (the only keyed kind in v1)', () => {
    renderKeyField();
    expect(lastPickerProps?.kinds).toEqual(PERSON_ONLY);
  });

  it('writes person_{id} for a Person pick', () => {
    const onChange = renderKeyField();
    lastPickerProps!.onPick(personRefFromScribe({ id: 42, name: 'A. Scribe' }));
    expect(onChange).toHaveBeenCalledWith('person_42');
  });

  it.each([
    ['a place', () => placeRef('Kelso')],
    ['a manuscript', () => manuscriptRefFromItemPart({ id: 5, display_label: 'MS 5' })],
    [
      'an external url',
      (): ResourceRef => ({ kind: 'external', target: 'https://x.org', label: 'x' }),
    ],
  ])('never writes a key for %s pick, and says why', (_name, makeRef) => {
    toastWarning.mockClear();
    const onChange = renderKeyField(['person', 'place', 'manuscript', 'external']);
    lastPickerProps!.onPick(makeRef());
    expect(onChange).not.toHaveBeenCalled();
    expect(toastWarning).toHaveBeenCalledTimes(1);
  });
});

describe('the key fields with no correct pick keep manual entry only', () => {
  const CONTENTS: MsContentsState = {
    msItems: [{ title: { text: 'De Civitate Dei' }, author: { text: 'Augustine' } }],
  };
  const HISTORY: HistoryState = {
    origin: { origPlace: { settlement: { text: 'Kelso' } } },
    provenances: [],
  };

  it('renders a lookup button for <author> but not for <title>', () => {
    render(<MsContentsForm state={CONTENTS} onChange={() => {}} />);
    // One lookup button in the whole msItem: the author authority.
    expect(screen.getAllByRole('button', { name: 'Look up authority' })).toHaveLength(1);
  });

  it('renders no lookup button for the origPlace country/region/settlement keys', () => {
    render(<HistoryForm state={HISTORY} onChange={() => {}} />);
    expect(screen.queryAllByRole('button', { name: 'Look up authority' })).toHaveLength(0);
  });
});

describe('why a person key must not land on a place or a title', () => {
  it('renders a person_ key on <settlement> as a link to a scribe page', () => {
    // The renderer resolves ANY @key, so a mis-stamped person key on a place
    // silently links the place to a scribe detail page — hence the scoping.
    const html = renderMsDescArea(
      'history',
      '<history><origin><origPlace><settlement key="person_42">Kelso</settlement>' +
        '</origPlace></origin></history>'
    );
    expect(html).toContain('<a href="/scribes/42"');
  });
});
