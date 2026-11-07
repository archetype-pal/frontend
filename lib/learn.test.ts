import { describe, expect, it } from 'vitest';

import {
  MAX_PICTURE_BYTES,
  MAX_ZOOM,
  NO_ZOOM,
  boundsOf,
  citedGlyphs,
  focusedBoxes,
  formatElapsed,
  glyphHref,
  hasLesson,
  iiifSrc,
  isLessonId,
  isWorking,
  learnDetail,
  learnFailure,
  lessonLanguage,
  paragraphs,
  parsePageParam,
  pictureProblem,
  pictureSrc,
  sameFocus,
  zoomTo,
} from './learn';
import { LearnError } from '@/services/learn';
import type { LearnBox, LearnGlyph, TutorSession } from '@/types/learn';

function file(name: string, type: string, size: number): File {
  // A File's size comes from its parts; only the size matters here.
  const blob = new File([], name, { type });
  Object.defineProperty(blob, 'size', { value: size });
  return blob;
}

const box = (x: number, y: number, width = 10, height = 10, label = ''): LearnBox => ({
  x,
  y,
  width,
  height,
  label,
});

describe('lessonLanguage', () => {
  it("teaches in the site's language when the tutor offers it", () => {
    expect(lessonLanguage('de', ['en', 'de', 'fr'])).toBe('de');
    expect(lessonLanguage('fr')).toBe('fr');
  });

  it('falls back to English for a language it does not teach', () => {
    expect(lessonLanguage('fr', ['en', 'de'])).toBe('en');
    expect(lessonLanguage('it', ['en', 'it'])).toBe('en');
  });
});

describe('pictureProblem', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp', 'image/tiff'])('takes %s', (type) => {
    expect(pictureProblem(file('page', type, 1000))).toBeNull();
  });

  it('takes a TIFF the system gave no type, by its name', () => {
    expect(pictureProblem(file('scan.TIF', '', 1000))).toBeNull();
    expect(pictureProblem(file('scan.tiff', '', 1000))).toBeNull();
  });

  it.each([
    ['a PDF', file('charter.pdf', 'application/pdf', 1000)],
    ['a GIF', file('charter.gif', 'image/gif', 1000)],
    ['an untyped file with no picture name', file('charter', '', 1000)],
  ])('refuses %s', (_, picture) => {
    expect(pictureProblem(picture)).toBe('type');
  });

  it('refuses an empty file', () => {
    expect(pictureProblem(file('page.jpg', 'image/jpeg', 0))).toBe('empty');
  });

  it('takes a picture of exactly the largest size, and refuses one byte more', () => {
    expect(pictureProblem(file('page.jpg', 'image/jpeg', MAX_PICTURE_BYTES))).toBeNull();
    expect(pictureProblem(file('page.jpg', 'image/jpeg', MAX_PICTURE_BYTES + 1))).toBe('size');
  });
});

describe('parsePageParam', () => {
  it('reads a page id', () => {
    expect(parsePageParam('64')).toBe(64);
    expect(parsePageParam(['64', '65'])).toBe(64);
  });

  it.each([undefined, null, '', '0', '-3', '6.4', '64abc', ' 64', '99999999999999999999'])(
    'reads %j as no page',
    (value) => {
      expect(parsePageParam(value)).toBeNull();
    }
  );
});

describe('isLessonId', () => {
  it('takes a UUID, in either case', () => {
    expect(isLessonId('dd6a7786-4b32-4203-ba04-91c96a461cec')).toBe(true);
    expect(isLessonId('DD6A7786-4B32-4203-BA04-91C96A461CEC')).toBe(true);
  });

  it.each(['64', 'dd6a7786', 'dd6a7786-4b32-4203-ba04-91c96a461cec/questions', ''])(
    'refuses %j',
    (value) => {
      expect(isLessonId(value)).toBe(false);
    }
  );
});

describe('isWorking and hasLesson', () => {
  it('is working while queued or working', () => {
    expect(isWorking('queued')).toBe(true);
    expect(isWorking('working')).toBe(true);
    expect(isWorking('ready')).toBe(false);
    expect(isWorking('failed')).toBe(false);
    expect(isWorking('refused')).toBe(false);
  });

  it('has a lesson once a step or the overview is written', () => {
    expect(hasLesson({ walkthrough: {} })).toBe(false);
    expect(hasLesson({ walkthrough: { steps: [] } })).toBe(false);
    expect(hasLesson({ walkthrough: { overview: 'A charter hand.' } })).toBe(true);
    expect(
      hasLesson({
        walkthrough: {
          steps: [
            {
              title: 'The a',
              explanation: '',
              boxes: [],
              character: 'a',
              allograph_id: null,
              look_for: [],
              example_glyph_ids: [],
            },
          ],
        },
      })
    ).toBe(true);
  });
});

describe('pictureSrc', () => {
  it('keeps the path and query on the public API base', () => {
    expect(
      pictureSrc(
        { picture_url: 'http://api:8000/api/v1/learn/sessions/abc/picture/?v=2' },
        'https://beta.example.org/'
      )
    ).toBe('https://beta.example.org/api/v1/learn/sessions/abc/picture/?v=2');
  });

  it('is null until the picture is fetched', () => {
    expect(pictureSrc({ picture_url: null }, 'http://localhost:8000')).toBeNull();
  });
});

describe('iiifSrc', () => {
  it('sends an absolute IIIF URL through the same-origin proxy, keeping its encoding', () => {
    expect(
      iiifSrc('http://sipi:1024/15_1_18%2Fno_16%2F74441901.jp2/1,2,3,4/%5E!240,240/0/default.jpg')
    ).toBe('/iiif-proxy/15_1_18%2Fno_16%2F74441901.jp2/1,2,3,4/%5E!240,240/0/default.jpg');
  });

  it('leaves a relative URL alone, and has nothing for none', () => {
    expect(iiifSrc('/iiif-proxy/a.jp2/full/max/0/default.jpg')).toBe(
      '/iiif-proxy/a.jp2/full/max/0/default.jpg'
    );
    expect(iiifSrc(null)).toBeNull();
    expect(iiifSrc('  ')).toBeNull();
  });
});

describe('glyphHref and citedGlyphs', () => {
  const glyph = (id: number) => ({ id, item_image: 64 }) as LearnGlyph;

  it("opens the viewer on the glyph's page, on the glyph", () => {
    expect(glyphHref(glyph(326), 12)).toBe('/manuscripts/12/images/64?graph=326');
  });

  it('keeps the order cited, skipping a glyph it could not show', () => {
    const glyphs = { '3': glyph(3), '1': glyph(1) };
    expect(citedGlyphs([1, 2, 3], glyphs).map((g) => g.id)).toEqual([1, 3]);
    expect(citedGlyphs(undefined, glyphs)).toEqual([]);
    expect(citedGlyphs([1], undefined)).toEqual([]);
  });
});

describe('paragraphs', () => {
  it('splits on blank lines and drops empty ones', () => {
    expect(paragraphs('One.\nStill one.\n\n  Two.  \n \n\n')).toEqual(['One.\nStill one.', 'Two.']);
    expect(paragraphs(undefined)).toEqual([]);
  });
});

describe('focusedBoxes and sameFocus', () => {
  const session = {
    walkthrough: {
      steps: [
        {
          title: 'The a',
          explanation: '',
          boxes: [box(1, 1)],
          character: 'a',
          allograph_id: null,
          look_for: [],
          example_glyph_ids: [],
        },
      ],
      practice: { instructions: '', box: box(5, 5), reading: '', note: '' },
    },
    messages: [
      { role: 'student', text: 'Where?', at: '' },
      { role: 'tutor', text: 'Here.', boxes: [box(2, 2), box(3, 3)], at: '' },
    ],
  } as Pick<TutorSession, 'walkthrough' | 'messages'>;

  it('gives the boxes of what is in focus', () => {
    expect(focusedBoxes(session, null)).toEqual([]);
    expect(focusedBoxes(session, { kind: 'step', index: 0 })).toEqual([box(1, 1)]);
    expect(focusedBoxes(session, { kind: 'practice' })).toEqual([box(5, 5)]);
    expect(focusedBoxes(session, { kind: 'message', index: 1 })).toEqual([box(2, 2), box(3, 3)]);
    expect(focusedBoxes(session, { kind: 'message', index: 0 })).toEqual([]);
    expect(focusedBoxes(session, { kind: 'step', index: 9 })).toEqual([]);
  });

  it('compares two focuses', () => {
    expect(sameFocus(null, null)).toBe(true);
    expect(sameFocus({ kind: 'practice' }, { kind: 'practice' })).toBe(true);
    expect(sameFocus({ kind: 'step', index: 1 }, { kind: 'step', index: 1 })).toBe(true);
    expect(sameFocus({ kind: 'step', index: 1 }, { kind: 'step', index: 2 })).toBe(false);
    expect(sameFocus({ kind: 'step', index: 1 }, { kind: 'message', index: 1 })).toBe(false);
    expect(sameFocus({ kind: 'practice' }, null)).toBe(false);
  });
});

describe('boundsOf', () => {
  it('is the smallest rectangle around every box', () => {
    expect(boundsOf([box(10, 20, 30, 40), box(100, 5, 10, 10)])).toEqual({
      x: 10,
      y: 5,
      width: 100,
      height: 55,
    });
    expect(boundsOf([])).toBeNull();
  });
});

describe('zoomTo', () => {
  /** Where a picture point lands once zoomed, in picture pixels of the frame. */
  const land = (zoom: ReturnType<typeof zoomTo>, x: number, y: number, w: number, h: number) => [
    (zoom.x / 100) * w + zoom.scale * x,
    (zoom.y / 100) * h + zoom.scale * y,
  ];

  it('does not zoom with nothing to show, or on an unmeasured picture', () => {
    expect(zoomTo(null, 2000, 1500)).toEqual(NO_ZOOM);
    expect(zoomTo({ x: 0, y: 0, width: 10, height: 10 }, 0, 0)).toEqual(NO_ZOOM);
  });

  it('does not zoom on what already fills the picture', () => {
    expect(zoomTo({ x: 0, y: 0, width: 2000, height: 1500 }, 2000, 1500)).toEqual(NO_ZOOM);
  });

  it('brings a box to the middle of the frame', () => {
    const bounds = { x: 900, y: 700, width: 200, height: 100 };
    const zoom = zoomTo(bounds, 2000, 1500);

    expect(zoom.scale).toBeGreaterThan(1);
    const [cx, cy] = land(zoom, 1000, 750, 2000, 1500);
    expect(cx).toBeCloseTo(1000);
    expect(cy).toBeCloseTo(750);
  });

  it('closes in no further than the most it may', () => {
    expect(zoomTo({ x: 1000, y: 700, width: 2, height: 2 }, 2000, 1500).scale).toBe(MAX_ZOOM);
  });

  it("never shows past the picture's edge", () => {
    const zoom = zoomTo({ x: 1950, y: 1460, width: 40, height: 30 }, 2000, 1500);

    expect(zoom.scale).toBeGreaterThan(1);
    // The picture's far corner stays at the frame's far corner, not inside it.
    const [right, bottom] = land(zoom, 2000, 1500, 2000, 1500);
    expect(right).toBeCloseTo(2000);
    expect(bottom).toBeCloseTo(1500);
    expect(zoomTo({ x: 0, y: 0, width: 40, height: 30 }, 2000, 1500)).toMatchObject({
      x: 0,
      y: 0,
    });
  });
});

describe('formatElapsed', () => {
  it.each([
    [-5, '0:00'],
    [0, '0:00'],
    [9_999, '0:09'],
    [75_000, '1:15'],
    [3_599_000, '59:59'],
    [3_723_000, '1:02:03'],
  ])('shows %i ms as %s', (ms, shown) => {
    expect(formatElapsed(ms)).toBe(shown);
  });
});

describe('learnFailure and learnDetail', () => {
  it.each([
    [0, 'unreachable'],
    [502, 'unreachable'],
    [504, 'unreachable'],
    [400, 'invalid'],
    [413, 'invalid'],
    [401, 'forbidden'],
    [403, 'forbidden'],
    [404, 'notFound'],
    [409, 'busy'],
    [429, 'throttled'],
    [503, 'unavailable'],
    [500, 'unknown'],
  ])('calls a %i refusal %s', (status, kind) => {
    expect(learnFailure(new LearnError(status, ''))).toBe(kind);
  });

  it("calls anything else unknown, with none of the API's words", () => {
    expect(learnFailure(new Error('boom'))).toBe('unknown');
    expect(learnDetail(new Error('boom'))).toBe('');
    expect(learnDetail(new LearnError(429, 'Try again tomorrow.'))).toBe('Try again tomorrow.');
  });
});
