/** @vitest-environment jsdom */
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LessonView } from './lesson-view';
import { HIDDEN_POLL_LIMIT_MS, POLL_MS } from '@/lib/learn';
import { renderWithQueryClient } from '@/test/render';
import type { LearnBox, LearnGlyph, LearnStep, TutorSession } from '@/types/learn';

const state = vi.hoisted(() => ({
  auth: { isAuthenticated: false, isReady: true },
}));

const services = vi.hoisted(() => ({
  getLesson: vi.fn(),
  askTutor: vi.fn(),
  getGlyphPart: vi.fn(),
  getPagePart: vi.fn(),
}));

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => state.auth }));
vi.mock('@/services/learn', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/learn')>()),
  ...services,
}));

const { LearnError } = await import('@/services/learn');

const ID = 'a1906561-2127-41de-ae83-ebdcc1ccd9a5';
const CREATED = '2026-11-05T10:00:00Z';

const box = (x: number, y: number, label = ''): LearnBox => ({
  x,
  y,
  width: 40,
  height: 50,
  label,
});

const GLYPH: LearnGlyph = {
  id: 326,
  allograph_id: 5,
  letter_form: 'a, two-compartment',
  hand: 'Main hand',
  page: 'NLS Adv. MS 15.1.18, no. 12',
  item_image: 70,
  charter: 'Charter of King William to Kelso',
  historical_item: 9,
  date: '1170 x 1180',
  crop_url: 'http://sipi:1024/no_12.jp2/1384,1007,151,172/%5E!240,240/0/default.jpg',
};

const STEPS: LearnStep[] = [
  {
    title: 'The a',
    explanation: 'Its two compartments are closed.\n\nCompare it with the examples.',
    boxes: [box(100, 120, 'a in line 1'), box(300, 260, 'a in line 3')],
    character: 'a',
    allograph_id: 5,
    look_for: ['Whether the upper bowl is closed'],
    example_glyph_ids: [326],
  },
  {
    title: 'The long s',
    explanation: 'It stands on the line.',
    boxes: [box(800, 600)],
    character: 'ſ',
    allograph_id: 6,
    look_for: [],
    example_glyph_ids: [],
  },
];

function session(overrides: Partial<TutorSession> = {}): TutorSession {
  return {
    id: ID,
    status: 'ready',
    error: '',
    item_image: 64,
    page: {
      id: 64,
      label: 'NLS Adv. MS 15.1.18, no. 16',
      charter: 'Charter of King William to Arbroath',
      date: '1178 x 1182',
      thumbnail_url: null,
    },
    uploaded: false,
    picture_url: `http://api:8000/api/v1/learn/sessions/${ID}/picture/`,
    width: 2000,
    height: 1500,
    language: 'en',
    walkthrough: {
      title: 'A royal charter hand',
      overview: 'This is a charter hand of the later twelfth century.',
      script: {
        name: 'Charter minuscule',
        date: 'c. 1180',
        reasons: ['Long ascenders with split tops'],
      },
      steps: STEPS,
      practice: {
        instructions: 'Read the first three words of line 4.',
        box: box(200, 400, 'line 4'),
        reading: 'Willelmus dei gratia',
        note: 'The abbreviation mark stands for -us.',
      },
      glyphs: { '326': GLYPH },
    },
    messages: [],
    progress: [],
    can_ask: false,
    questions_left: 5,
    created: CREATED,
    updated: CREATED,
    ...overrides,
  };
}

function working(overrides: Partial<TutorSession> = {}): TutorSession {
  return session({ status: 'working', walkthrough: {}, ...overrides });
}

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

const layer = () => screen.getByTestId('lesson-picture-layer');
const scale = () => Number(/scale\(([\d.]+)\)/.exec(layer().style.transform)?.[1]);
const stepCard = (index: number) =>
  document.querySelector<HTMLButtonElement>(`#lesson-step-${index} h3 button`)!;
const stepOnPicture = (name: string) => screen.getByRole('button', { name });
const emphases = (group: Element) =>
  [...group.querySelectorAll('[data-box]')].map((g) => g.getAttribute('data-emphasis'));

beforeEach(() => {
  state.auth = { isAuthenticated: false, isReady: true };
  services.getLesson.mockReset().mockResolvedValue(session());
  services.askTutor.mockReset();
  services.getGlyphPart.mockReset().mockResolvedValue(12);
  services.getPagePart.mockReset().mockResolvedValue(7);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('<LessonView> while the tutor writes the lesson', () => {
  let visibility: DocumentVisibilityState = 'visible';

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(Date.parse(CREATED) + 75_000));
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
  });

  function setVisibility(next: DocumentVisibilityState) {
    visibility = next;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }

  it('shows how far it has got, and how long it has taken', async () => {
    services.getLesson.mockResolvedValue(
      working({
        progress: [
          { text: 'Looked at the picture', at: CREATED },
          { text: 'Found 12 annotated letters', at: CREATED },
        ],
      })
    );
    renderWithQueryClient(<LessonView id={ID} />);

    const log = await screen.findByRole('log', { name: 'What the tutor has done so far' });
    expect(log.getAttribute('aria-live')).toBe('polite');
    expect(within(log).getByText('Looked at the picture')).toBeTruthy();
    expect(within(log).getByText('Found 12 annotated letters')).toBeTruthy();
    expect(within(log).getByText('Working…')).toBeTruthy();
    expect(screen.getByText('1:15 so far')).toBeTruthy();
    expect(screen.getByText('NLS Adv. MS 15.1.18, no. 16')).toBeTruthy();
  });

  it('says when it has not started yet', async () => {
    services.getLesson.mockResolvedValue(working({ status: 'queued' }));
    renderWithQueryClient(<LessonView id={ID} />);

    expect(await screen.findByText('Waiting for the tutor to start…')).toBeTruthy();
  });

  it('asks again every few seconds, and stops once the lesson is written', async () => {
    services.getLesson
      .mockResolvedValueOnce(
        working({ progress: [{ text: 'Looked at the picture', at: CREATED }] })
      )
      .mockResolvedValueOnce(
        working({
          progress: [
            { text: 'Looked at the picture', at: CREATED },
            { text: 'Wrote step 1', at: CREATED },
          ],
        })
      )
      .mockResolvedValue(session());
    renderWithQueryClient(<LessonView id={ID} />);

    await screen.findByText('Looked at the picture');
    expect(services.getLesson).toHaveBeenCalledTimes(1);

    await tick(POLL_MS);
    expect(services.getLesson).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Wrote step 1')).toBeTruthy();

    await tick(POLL_MS);
    expect(services.getLesson).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('heading', { level: 1, name: 'A royal charter hand' })).toBeTruthy();

    await tick(POLL_MS * 4);
    expect(services.getLesson).toHaveBeenCalledTimes(3);
  });

  it('stops asking once the lesson has failed', async () => {
    services.getLesson
      .mockResolvedValueOnce(working())
      .mockResolvedValue(working({ status: 'failed', error: 'The picture was blank.' }));
    renderWithQueryClient(<LessonView id={ID} />);

    await screen.findByText('Working…');
    await tick(POLL_MS);
    expect(screen.getByText('The picture was blank.')).toBeTruthy();

    await tick(POLL_MS * 4);
    expect(services.getLesson).toHaveBeenCalledTimes(2);
  });

  it('does not ask about a lesson already written', async () => {
    renderWithQueryClient(<LessonView id={ID} />);

    await screen.findByRole('heading', { level: 1, name: 'A royal charter hand' });
    await tick(POLL_MS * 4);
    expect(services.getLesson).toHaveBeenCalledTimes(1);
  });

  it('stops asking while hidden a long while, and asks again the moment it is shown', async () => {
    services.getLesson.mockResolvedValue(working());
    renderWithQueryClient(<LessonView id={ID} />);
    await screen.findByText('Working…');

    setVisibility('hidden');
    await tick(HIDDEN_POLL_LIMIT_MS);
    const asked = services.getLesson.mock.calls.length;
    expect(screen.getByText(/Paused while this page was hidden/)).toBeTruthy();

    await tick(POLL_MS * 4);
    expect(services.getLesson).toHaveBeenCalledTimes(asked);

    setVisibility('visible');
    await tick(0);
    expect(services.getLesson).toHaveBeenCalledTimes(asked + 1);
    expect(screen.queryByText(/Paused while this page was hidden/)).toBeNull();

    await tick(POLL_MS);
    expect(services.getLesson).toHaveBeenCalledTimes(asked + 2);
  });

  it('keeps asking when a check fails, and says so', async () => {
    services.getLesson
      .mockResolvedValueOnce(working())
      .mockRejectedValueOnce(new LearnError(502, ''))
      .mockResolvedValue(working());
    renderWithQueryClient(<LessonView id={ID} />);
    await screen.findByText('Working…');

    await tick(POLL_MS);
    expect(screen.getByText(/Lost touch with the tutor/)).toBeTruthy();

    await tick(POLL_MS);
    expect(services.getLesson).toHaveBeenCalledTimes(3);
    expect(screen.queryByText(/Lost touch with the tutor/)).toBeNull();
  });
});

describe('<LessonView> a written lesson', () => {
  it('shows the walkthrough, and where the lesson came from', async () => {
    renderWithQueryClient(<LessonView id={ID} />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'A royal charter hand' })
    ).toBeTruthy();
    expect(
      screen.getByText(
        'NLS Adv. MS 15.1.18, no. 16 · Charter of King William to Arbroath · 1178 x 1182'
      )
    ).toBeTruthy();
    expect(screen.getByText('This is a charter hand of the later twelfth century.')).toBeTruthy();
    expect(screen.getByText('Charter minuscule')).toBeTruthy();
    expect(screen.getByText('Long ascenders with split tops')).toBeTruthy();
    expect(
      (await screen.findByRole('link', { name: 'Open the page in the viewer' })).getAttribute(
        'href'
      )
    ).toBe('/manuscripts/7/images/64');
    expect(services.getPagePart).toHaveBeenCalledWith(64);
  });

  it('draws the boxes in the picture’s own pixels, over the picture', async () => {
    renderWithQueryClient(<LessonView id={ID} />);

    const overlay = await screen.findByRole('group', { name: 'Places the lesson points at' });
    expect(overlay.getAttribute('viewBox')).toBe('0 0 2000 1500');
    const first = stepOnPicture('Step 1: The a (2 places)').querySelector('rect')!;
    expect(first.getAttribute('x')).toBe('100');
    expect(first.getAttribute('y')).toBe('120');
    expect(first.getAttribute('width')).toBe('40');
    expect(first.getAttribute('height')).toBe('50');
    // The picture comes from the public API, whatever host the API built its address on.
    const picture = screen.getByRole('img', { name: 'NLS Adv. MS 15.1.18, no. 16' });
    expect(picture.getAttribute('src')).toBe(
      `http://localhost:8000/api/v1/learn/sessions/${ID}/picture/`
    );
    expect(scale()).toBe(1);
  });

  it('brings a step’s places forward when the step is chosen, and closes in on them', async () => {
    renderWithQueryClient(<LessonView id={ID} />);
    await screen.findByRole('group', { name: 'Places the lesson points at' });
    const first = stepOnPicture('Step 1: The a (2 places)');
    const second = stepOnPicture('Step 2: The long s (1 place)');
    expect(emphases(first)).toEqual(['normal', 'normal']);

    fireEvent.click(stepCard(0));

    expect(stepCard(0).getAttribute('aria-expanded')).toBe('true');
    expect(first.getAttribute('aria-pressed')).toBe('true');
    expect(emphases(first)).toEqual(['active', 'active']);
    expect(emphases(second)).toEqual(['faint']);
    expect(screen.getByText('Step 1 of 2 · The a')).toBeTruthy();
    expect(screen.getByText('Its two compartments are closed.')).toBeTruthy();
    expect(screen.getByText('Whether the upper bowl is closed')).toBeTruthy();
    const wide = scale();
    expect(wide).toBeGreaterThan(1);

    // One of its places: that one is chosen, and the picture closes in further.
    fireEvent.click(screen.getByRole('button', { name: 'a in line 3' }));
    expect(screen.getByRole('button', { name: 'a in line 3' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(emphases(first)).toEqual(['active', 'selected']);
    expect(scale()).toBeGreaterThan(wide);

    // Back to the whole page, and in again.
    fireEvent.click(screen.getByRole('button', { name: 'Whole page' }));
    expect(scale()).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(scale()).toBeGreaterThan(1);
  });

  it('chooses a step from its places on the picture, by pointer or keyboard', async () => {
    renderWithQueryClient(<LessonView id={ID} />);
    await screen.findByRole('group', { name: 'Places the lesson points at' });

    fireEvent.click(stepOnPicture('Step 2: The long s (1 place)'));
    expect(stepCard(1).getAttribute('aria-expanded')).toBe('true');
    expect(stepCard(0).getAttribute('aria-expanded')).toBe('false');

    const first = stepOnPicture('Step 1: The a (2 places)');
    expect(first.getAttribute('tabindex')).toBe('0');
    fireEvent.keyDown(first, { key: 'Enter' });
    expect(stepCard(0).getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(stepOnPicture('Step 2: The long s (1 place)'), { key: ' ' });
    expect(stepCard(1).getAttribute('aria-expanded')).toBe('true');
  });

  it('steps through the lesson from the picture and from the steps', async () => {
    renderWithQueryClient(<LessonView id={ID} />);
    await screen.findByRole('group', { name: 'Places the lesson points at' });

    const picture = within(screen.getByRole('figure'));
    fireEvent.click(screen.getByRole('button', { name: 'Begin with step 1' }));
    expect(stepCard(0).getAttribute('aria-expanded')).toBe('true');
    expect(
      (picture.getByRole('button', { name: 'Previous step' }) as HTMLButtonElement).disabled
    ).toBe(true);

    // From the picture's own controls, and from the step's.
    fireEvent.click(picture.getByRole('button', { name: 'Next step' }));
    expect(stepCard(1).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Step 2 of 2 · The long s')).toBeTruthy();
    expect((picture.getByRole('button', { name: 'Next step' }) as HTMLButtonElement).disabled).toBe(
      true
    );
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(stepCard(0).getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(
      within(document.getElementById('lesson-step-0')!).getByRole('button', { name: 'Next step' })
    );
    expect(stepCard(1).getAttribute('aria-expanded')).toBe('true');

    // The last step leads on to the practice.
    fireEvent.click(screen.getByRole('button', { name: 'On to the practice' }));
    expect(screen.getByRole('button', { name: 'Show me where' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(screen.getByText('Practice', { selector: 'p' })).toBeTruthy();

    // Closing the open step leaves the whole page.
    fireEvent.click(stepCard(1));
    fireEvent.click(stepCard(1));
    expect(stepCard(1).getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText('The whole page')).toBeTruthy();
  });

  it('shows the same letter in other charters, each linked to the viewer', async () => {
    renderWithQueryClient(<LessonView id={ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Begin with step 1' }));

    const examples = screen.getByRole('list', { name: 'The same letter in other charters' });
    expect(within(examples).getByText('a, two-compartment')).toBeTruthy();
    expect(within(examples).getByText('Charter of King William to Kelso')).toBeTruthy();
    // Through the same-origin IIIF proxy, as every other IIIF image.
    const crop = within(examples).getByRole('img', {
      name: 'a, two-compartment from Charter of King William to Kelso',
    });
    expect(new URL(crop.getAttribute('src')!, 'http://site').pathname).toBe(
      '/iiif-proxy/no_12.jp2/1384,1007,151,172/%5E!240,240/0/default.jpg'
    );
    const open = await within(examples).findByRole('link', { name: 'Open in the viewer' });
    expect(open.getAttribute('href')).toBe('/manuscripts/12/images/70?graph=326');
    expect(services.getGlyphPart).toHaveBeenCalledWith(326);
  });
});

describe('<LessonView> the practice', () => {
  it('shows where to read, and the answer only when asked', async () => {
    renderWithQueryClient(<LessonView id={ID} />);
    await screen.findByText('Read the first three words of line 4.');
    expect(screen.queryByText('Willelmus dei gratia')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show me where' }));
    const overlay = screen.getByRole('group', { name: 'Places the lesson points at' });
    const dashed = overlay.querySelector('rect[stroke-dasharray]')!;
    expect(dashed.getAttribute('x')).toBe('200');
    expect(dashed.getAttribute('y')).toBe('400');
    expect(scale()).toBeGreaterThan(1);
    expect(emphases(stepOnPicture('Step 1: The a (2 places)'))).toEqual(['faint', 'faint']);

    fireEvent.change(screen.getByLabelText('Your reading'), {
      target: { value: 'Willelmus dei gra' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Show the answer' }));

    expect(screen.getByText('Willelmus dei gratia')).toBeTruthy();
    expect(screen.getByText('Willelmus dei gra', { selector: 'p' })).toBeTruthy();
    expect(screen.getByText('The abbreviation mark stands for -us.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Hide the answer' }));
    expect(screen.queryByText('Willelmus dei gratia')).toBeNull();
  });

  it('brings the line forward when the student starts reading it', async () => {
    renderWithQueryClient(<LessonView id={ID} />);

    fireEvent.focus(await screen.findByLabelText('Your reading'));

    expect(screen.getByRole('button', { name: 'Show me where' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
  });
});

describe('<LessonView> questions', () => {
  const question = {
    role: 'student' as const,
    text: 'Is this a c or a t?',
    at: '2026-11-05T10:10:00Z',
  };
  const answer = {
    role: 'tutor' as const,
    text: 'It is a t: its stem rises above the headline.',
    boxes: [box(600, 300, 't in line 2'), box(900, 700, 'c in line 7')],
    at: '2026-11-05T10:11:00Z',
  };

  it('lets the student who started it ask, and says how many questions are left', async () => {
    state.auth = { isAuthenticated: true, isReady: true };
    services.getLesson.mockResolvedValue(session({ can_ask: true, questions_left: 3 }));
    services.askTutor.mockResolvedValue(
      session({ status: 'working', can_ask: true, questions_left: 2, messages: [question] })
    );
    const { client } = renderWithQueryClient(<LessonView id={ID} />);

    expect(await screen.findByText('3 questions left')).toBeTruthy();
    expect(services.getLesson).toHaveBeenCalledWith(ID, true);
    const field = screen.getByLabelText('Your question') as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: '  Is this a c or a t?  ' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    await waitFor(() =>
      expect(services.askTutor).toHaveBeenCalledWith(ID, 'Is this a c or a t?', true)
    );
    // The session comes back working on the answer, and the page shows it at once.
    expect(
      await screen.findByText('The tutor is thinking about your question…', { selector: 'p' })
    ).toBeTruthy();
    expect(screen.getByText('Is this a c or a t?')).toBeTruthy();
    expect(field.value).toBe('');
    expect(field.disabled).toBe(true);
    expect(client.getQueryData(['learn-session', ID, true])).toMatchObject({ status: 'working' });
  });

  it('keeps a new line for Shift+Enter, and asks nothing empty', async () => {
    services.getLesson.mockResolvedValue(session({ can_ask: true, questions_left: 1 }));
    renderWithQueryClient(<LessonView id={ID} />);

    const field = await screen.findByLabelText('Your question');
    expect(screen.getByText('1 question left')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Ask' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(field, { key: 'Enter' });
    fireEvent.change(field, { target: { value: 'Why?' } });
    fireEvent.keyDown(field, { key: 'Enter', shiftKey: true });

    expect(services.askTutor).not.toHaveBeenCalled();
  });

  it("shows the tutor's refusal, and keeps the question", async () => {
    services.getLesson.mockResolvedValue(session({ can_ask: true, questions_left: 3 }));
    services.askTutor.mockRejectedValue(
      new LearnError(409, 'The tutor is still answering your last question.')
    );
    renderWithQueryClient(<LessonView id={ID} />);

    const field = (await screen.findByLabelText('Your question')) as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: 'And this one?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));

    expect(await screen.findByText('The tutor is still working on this lesson.')).toBeTruthy();
    expect(screen.getByText('The tutor is still answering your last question.')).toBeTruthy();
    expect(field.value).toBe('And this one?');
  });

  it('moves to the answer when it arrives', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    services.getLesson
      .mockResolvedValueOnce(session({ can_ask: true, questions_left: 3 }))
      .mockResolvedValue(
        session({ can_ask: true, questions_left: 2, messages: [question, answer] })
      );
    services.askTutor.mockResolvedValue(
      session({ status: 'working', can_ask: true, questions_left: 2, messages: [question] })
    );
    renderWithQueryClient(<LessonView id={ID} />);

    fireEvent.change(await screen.findByLabelText('Your question'), {
      target: { value: question.text },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
    await screen.findByText('The tutor is thinking about your question…', { selector: 'p' });

    await tick(POLL_MS);
    const reply = screen.getByText(answer.text).closest('li')!;
    expect(document.activeElement).toBe(reply);
    expect(screen.getByText('2 questions left')).toBeTruthy();
  });

  it("shows an answer's places on the picture when asked", async () => {
    services.getLesson.mockResolvedValue(session({ messages: [question, answer] }));
    renderWithQueryClient(<LessonView id={ID} />);

    const show = await screen.findByRole('button', { name: 'Show 2 places on the picture' });
    const overlay = screen.getByRole('group', { name: 'Places the lesson points at' });
    const drawn = () => overlay.querySelectorAll(':scope > [data-box]');
    expect(drawn()).toHaveLength(0);

    fireEvent.click(show);
    expect(show.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText("The tutor's answer")).toBeTruthy();
    expect([...drawn()].map((g) => g.querySelector('rect')!.getAttribute('x'))).toEqual([
      '600',
      '900',
    ]);
    expect([...drawn()].map((g) => g.querySelector('text')?.textContent)).toEqual(['a', 'b']);

    fireEvent.click(screen.getByRole('button', { name: /c in line 7/ }));
    expect([...drawn()].map((g) => g.getAttribute('data-emphasis'))).toEqual([
      'active',
      'selected',
    ]);

    fireEvent.click(show);
    expect(drawn()).toHaveLength(0);
  });

  it('marks an answer the tutor could not give', async () => {
    services.getLesson.mockResolvedValue(
      session({
        messages: [
          question,
          { role: 'tutor', text: 'The model did not answer in time.', failed: true, at: '' },
        ],
      })
    );
    renderWithQueryClient(<LessonView id={ID} />);

    expect(await screen.findByText('The tutor could not answer this question')).toBeTruthy();
    expect(screen.getByText('The model did not answer in time.')).toBeTruthy();
  });

  it('lets anyone else read the conversation but not ask', async () => {
    services.getLesson.mockResolvedValue(session({ messages: [question, answer] }));
    renderWithQueryClient(<LessonView id={ID} />);

    expect(
      await screen.findByText('Only the person who started this lesson can ask it questions.')
    ).toBeTruthy();
    expect(screen.queryByLabelText('Your question')).toBeNull();
    expect(screen.getByText(answer.text)).toBeTruthy();
  });

  it('says when the questions are used up', async () => {
    services.getLesson.mockResolvedValue(session({ can_ask: false, questions_left: 0 }));
    renderWithQueryClient(<LessonView id={ID} />);

    expect(await screen.findByText(/This lesson's questions are used up/)).toBeTruthy();
  });
});

describe('<LessonView> when there is no lesson to show', () => {
  it('waits to know who is asking', () => {
    state.auth = { isAuthenticated: false, isReady: false };
    renderWithQueryClient(<LessonView id={ID} />);

    expect(screen.getByRole('status').textContent).toBe('Loading the lesson…');
    expect(services.getLesson).not.toHaveBeenCalled();
  });

  it('says a lesson does not exist', async () => {
    services.getLesson.mockRejectedValue(new LearnError(404, 'Not found.'));
    renderWithQueryClient(<LessonView id={ID} />);

    expect(
      await screen.findByRole('heading', { name: 'This lesson could not be found' })
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Start another lesson' }).getAttribute('href')).toBe(
      '/learn'
    );
  });

  it('says why a lesson could not be loaded, and tries again', async () => {
    services.getLesson.mockRejectedValueOnce(new LearnError(0, '')).mockResolvedValue(session());
    renderWithQueryClient(<LessonView id={ID} />);

    expect(
      await screen.findByRole('heading', { name: 'The lesson could not be loaded' })
    ).toBeTruthy();
    expect(screen.getByText(/Could not reach the tutor/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'A royal charter hand' })
    ).toBeTruthy();
  });

  it('says why the tutor could not finish, and offers the page again', async () => {
    services.getLesson.mockResolvedValue(
      working({ status: 'failed', error: 'The model did not answer in time.' })
    );
    renderWithQueryClient(<LessonView id={ID} />);

    expect(
      await screen.findByRole('heading', { name: 'The tutor could not finish this lesson' })
    ).toBeTruthy();
    expect(screen.getByText('The model did not answer in time.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Try this page again' }).getAttribute('href')).toBe(
      '/learn?page=64'
    );
    expect(screen.getByRole('link', { name: 'Start another lesson' }).getAttribute('href')).toBe(
      '/learn'
    );
  });

  it('says the tutor would not take a picture, with no page to try again', async () => {
    services.getLesson.mockResolvedValue(
      working({
        status: 'refused',
        error: 'This picture does not show handwriting.',
        item_image: null,
        page: null,
        uploaded: true,
      })
    );
    renderWithQueryClient(<LessonView id={ID} />);

    expect(
      await screen.findByRole('heading', { name: 'The tutor could not take this lesson' })
    ).toBeTruthy();
    expect(screen.getByText('This picture does not show handwriting.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Try this page again' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Start another lesson' })).toBeTruthy();
  });

  it('treats a lesson finished with nothing in it as failed', async () => {
    services.getLesson.mockResolvedValue(working({ status: 'ready' }));
    renderWithQueryClient(<LessonView id={ID} />);

    expect(
      await screen.findByRole('heading', { name: 'The tutor could not finish this lesson' })
    ).toBeTruthy();
    expect(screen.getByText('Please try again later.')).toBeTruthy();
  });
});
