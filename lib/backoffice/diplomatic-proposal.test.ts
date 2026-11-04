import { describe, expect, it } from 'vitest';

import {
  diplomaticAcceptBlocker,
  isKnownPipeline,
  isTruncated,
  itemCount,
  proposalQuotes,
} from './diplomatic-proposal';

describe('proposalQuotes', () => {
  it('checks entity names as written, but not the kind of act a transaction names', () => {
    expect(
      proposalQuotes('W2.1', {
        entities: [
          { role: 'granter', name: 'Johannes de Vallibus', normalised: 'John de Vaux' },
          { role: 'transaction', name: 'confirmation' },
          { role: 'witness', name: ' Roberto de Vallibus ' },
        ],
      })
    ).toEqual(['Johannes de Vallibus', 'Roberto de Vallibus']);
  });

  it('checks each formula by its excerpt, not its label', () => {
    expect(
      proposalQuotes('W2.2', {
        formulae: [
          { kind: 'salutation', label: 'Eternal greeting', excerpt: 'eternam in domino Salutem' },
          { kind: 'other', label: 'No excerpt' },
        ],
      })
    ).toEqual(['eternam in domino Salutem']);
  });

  it('checks what a dating flag quotes as its evidence', () => {
    expect(
      proposalQuotes('W3.2', { verdict: 'uncertain', evidence: 'Witnessed by "Dauid de Bernham".' })
    ).toEqual(['Dauid de Bernham']);
  });

  it('checks both ends of a relation, once each', () => {
    expect(
      proposalQuotes('W3.3', {
        triples: [
          { subject: 'carta', predicate: 'witnessed_by', object: 'Roberto de Vallibus' },
          { subject: 'carta', predicate: 'granted_by', object: 'Johannes de Vallibus' },
        ],
      })
    ).toEqual(['carta', 'Roberto de Vallibus', 'Johannes de Vallibus']);
  });

  it('checks nothing in a translation, which is English, or in an unknown pipeline', () => {
    expect(proposalQuotes('W2.4', { translation: 'Know all', notes: '' })).toEqual([]);
    expect(proposalQuotes('W9.9', { entities: [{ role: 'witness', name: 'x y' }] })).toEqual([]);
  });
});

describe('the rest of the helpers', () => {
  it('knows the registered pipelines', () => {
    expect(isKnownPipeline('W3.2')).toBe(true);
    expect(isKnownPipeline('W9.9')).toBe(false);
  });

  it('recognises the mark the backend leaves on a text it cut short', () => {
    expect(isTruncated('Sciant presentes […truncated]')).toBe(true);
    expect(isTruncated('Sciant presentes')).toBe(false);
  });

  it('blocks accepting only when the source text is gone', () => {
    expect(diplomaticAcceptBlocker({ source: null })).toBe('sourceGone');
    expect(
      diplomaticAcceptBlocker({
        source: {
          image_text: 1,
          type: 'Transcription',
          item_image: 2,
          item_part: 4,
          historical_item: 3,
          label: 'x',
          date: '',
        },
      })
    ).toBeNull();
  });

  it('counts the records an accept writes, one per item', () => {
    expect(itemCount('W2.1', { entities: [{ role: 'witness', name: 'a' }] })).toBe(1);
    expect(itemCount('W3.3', {})).toBe(0);
    expect(itemCount('W3.2', { verdict: 'uncertain' })).toBe(0);
  });
});
