import { describe, expect, it } from 'vitest';

import { findQuote, locateAll, quotedFragments } from './quote-finder';

const slice = (text: string, ranges: { start: number; end: number }[]) =>
  ranges.map(({ start, end }) => text.slice(start, end));

describe('findQuote', () => {
  it('ignores case and runs of whitespace, and answers in the original text', () => {
    const text = 'Hiis  testibus .\n Roberto de\tVallibus de Ellbotl’';

    const ranges = findQuote(text, 'roberto DE vallibus');

    expect(slice(text, ranges)).toEqual(['Roberto de\tVallibus']);
  });

  it('finds every occurrence', () => {
    const text = 'terram illam teneant … terram illam tenuit';

    expect(slice(text, findQuote(text, 'terram illam'))).toEqual(['terram illam', 'terram illam']);
  });

  it('trims the quotation marks and punctuation a model puts around a quotation', () => {
    const text = 'eternam in domino Salutem. Ad uniuersitatis';

    expect(slice(text, findQuote(text, '“eternam in domino Salutem.”'))).toEqual([
      'eternam in domino Salutem',
    ]);
    expect(slice(text, findQuote(text, '"in domino Salutem,"'))).toEqual(['in domino Salutem']);
  });

  it('keeps a closing ’ that is part of the reading, as an abbreviation sign is', () => {
    const text = 'in territorio de Golin’ . quam';

    expect(slice(text, findQuote(text, 'de Golin’'))).toEqual(['de Golin’']);
  });

  it('does not normalise spelling: a different spelling is a different reading', () => {
    expect(findQuote('Willelmo de Munfichet’', 'Guillelmo de Munfichet')).toEqual([]);
  });

  it('looks for nothing below two characters of substance', () => {
    expect(findQuote('a . b', '.')).toEqual([]);
    expect(findQuote('a . b', '“a”')).toEqual([]);
    expect(findQuote('a . b', '   ')).toEqual([]);
  });
});

describe('quotedFragments', () => {
  it('takes what the evidence puts in quotation marks', () => {
    expect(
      quotedFragments(
        'Witnesses include "magistro Laurentio" and “Dauid de Bernham”, and «Hugone».'
      )
    ).toEqual(['magistro Laurentio', 'Dauid de Bernham', 'Hugone']);
  });

  it('takes the whole evidence when it quotes nothing', () => {
    expect(quotedFragments('  Anno ab incarnatione domini  ')).toEqual([
      'Anno ab incarnatione domini',
    ]);
    expect(quotedFragments('')).toEqual([]);
  });
});

describe('locateAll', () => {
  it('merges overlapping hits and says which quotations were found', () => {
    const text = 'terram illam in territorio de Golin’ . quam';

    const { ranges, found } = locateAll(text, [
      'in territorio de Golin’',
      'terram illam in territorio',
      'Ricardo de Morevilla',
    ]);

    expect(slice(text, ranges)).toEqual(['terram illam in territorio de Golin’']);
    expect(found).toEqual([true, true, false]);
  });

  it('keeps separate hits apart, in reading order', () => {
    const text = 'carta mea … dicti Willelmi … carta';

    const { ranges } = locateAll(text, ['dicti Willelmi', 'carta']);

    expect(ranges.map((r) => r.start)).toEqual([0, 12, 29]);
  });
});

describe('apostrophes', () => {
  it('finds a quotation that differs only by its apostrophe', () => {
    expect(findQuote('Comite Malc’ . de Fif', "Comite Malc' . de Fif")).toHaveLength(1);
    expect(findQuote("Comite Malc' . de Fif", 'Comite Malc’ . de Fif')).toHaveLength(1);
  });
});
