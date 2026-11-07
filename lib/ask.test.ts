import { describe, expect, it } from 'vitest';

import {
  answerParagraphs,
  askFailure,
  citationTextHref,
  citationViewerHref,
  hasUnverifiedRegion,
  splitTools,
} from './ask';
import { AskError } from '@/services/agent';
import type { AgentCitation, AgentTool } from '@/types/agent';

const CITATION: AgentCitation = {
  claim: 'The O of the opening word is a closed bowl.',
  image_text_id: 3,
  item_image_id: 106,
  item_part_id: 240,
  historical_item_id: 239,
  type: 'Translation',
  locus: 'face',
  shelfmark: 'Adv. MS 15.1.18, no. 10',
  repository: 'National Library of Scotland',
  date: '1235 X 1265',
};

function tool(name: string, overrides: Partial<AgentTool> = {}): AgentTool {
  return {
    name,
    description: `${name} described`,
    granted: true,
    available: true,
    unavailable_reason: '',
    ...overrides,
  };
}

describe('citation links', () => {
  it('opens the folio by its part and image, which is the viewer route', () => {
    expect(citationViewerHref(CITATION)).toBe('/manuscripts/240/images/106');
  });

  it('opens the viewer on the annotation a verified region matched', () => {
    expect(
      citationViewerHref({ ...CITATION, region: '1,2,3,4', verified_region: true, graph_id: 132 })
    ).toBe('/manuscripts/240/images/106?graph=132');
  });

  it('does not point at a region no annotation confirms', () => {
    const unverified = { ...CITATION, region: '10,10,50,50', verified_region: false };

    expect(citationViewerHref(unverified)).toBe('/manuscripts/240/images/106');
    expect(hasUnverifiedRegion(unverified)).toBe(true);
    expect(hasUnverifiedRegion(CITATION)).toBe(false);
  });

  it('opens the cited text on the image text tab', () => {
    expect(citationTextHref(CITATION)).toBe('/manuscripts/240/images/106/texts/3');
  });
});

describe('answerParagraphs', () => {
  it('splits on blank lines, keeps single line breaks and drops empty paragraphs', () => {
    expect(answerParagraphs('First.\nStill first.\n\n  \n\nSecond. \n\n')).toEqual([
      'First.\nStill first.',
      'Second.',
    ]);
  });

  it('is empty for an empty answer', () => {
    expect(answerParagraphs('  ')).toEqual([]);
  });
});

describe('splitTools', () => {
  it('lists finding before reading before citing, whatever order the backend sends', () => {
    const { can } = splitTools([
      tool('cite_record'),
      tool('get_charter'),
      tool('get_image_regions'),
      tool('search_charters'),
    ]);

    expect(can.map((t) => t.name)).toEqual([
      'search_charters',
      'get_charter',
      'get_image_regions',
      'cite_record',
    ]);
  });

  it('puts a tool it cannot call, or that cannot answer, under what it cannot do', () => {
    const { can, cannot } = splitTools([
      tool('compare_hands', { available: false, unavailable_reason: 'Needs an encoder.' }),
      tool('fetch_witnesses', { granted: false }),
      tool('search_charters'),
      tool('a_new_tool', { available: false }),
    ]);

    expect(can.map((t) => t.name)).toEqual(['search_charters']);
    // Known tools in their order, then any the page has no words for.
    expect(cannot.map((t) => t.name)).toEqual(['fetch_witnesses', 'compare_hands', 'a_new_tool']);
  });
});

describe('askFailure', () => {
  it.each([
    [429, 'throttled'],
    [503, 'unavailable'],
    [400, 'invalid'],
    [0, 'unreachable'],
    [502, 'unreachable'],
    [504, 'unreachable'],
    [500, 'unknown'],
  ] as const)('names a %i as %s', (status, kind) => {
    expect(askFailure(new AskError(status, ''))).toBe(kind);
  });

  it('calls anything else unknown', () => {
    expect(askFailure(new Error('boom'))).toBe('unknown');
  });
});
