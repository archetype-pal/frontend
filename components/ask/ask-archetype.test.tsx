/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AskArchetype } from './ask-archetype';
import { renderWithQueryClient } from '@/test/render';
import type { AgentCitation, AgentRun, AgentTools } from '@/types/agent';

const services = vi.hoisted(() => ({
  askArchetype: vi.fn(),
  getAgentTools: vi.fn(),
}));

vi.mock('@/services/agent', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/agent')>()),
  ...services,
}));

const { AskError } = await import('@/services/agent');

const TOOLS: AgentTools = {
  identity: 'ask-archetype',
  enabled: true,
  // Alphabetical, as the backend sends them.
  tools: [
    {
      name: 'cite_record',
      description: '',
      granted: true,
      available: true,
      unavailable_reason: '',
    },
    {
      name: 'compare_hands',
      description: '',
      granted: true,
      available: false,
      unavailable_reason: 'Hand comparison needs the palaeographic encoder (W1.2/W1.3).',
    },
    {
      name: 'fetch_witnesses',
      description: '',
      granted: false,
      available: true,
      unavailable_reason: '',
    },
    {
      name: 'search_charters',
      description: '',
      granted: true,
      available: true,
      unavailable_reason: '',
    },
  ],
};

const CITED: AgentCitation = {
  claim: 'Cotton Ch. xviii.28 is dated 5 August 1245.',
  image_text_id: 599,
  item_image_id: 7131,
  item_part_id: 703,
  historical_item_id: 694,
  type: 'Transcription',
  locus: 'face',
  shelfmark: 'Cotton Ch. xviii.28',
  repository: 'British Library',
  date: 'Saturday 5 August 1245',
};

function run(overrides: Partial<AgentRun> = {}): AgentRun {
  return {
    id: 1,
    question: 'Which charters are dated?',
    answer: 'Cotton Ch. xviii.28 is dated.\n\nIt is in the British Library.',
    citations: [CITED],
    turns: 3,
    status: 'answered',
    created: '2026-11-04T00:00:00Z',
    ...overrides,
  };
}

const box = () => screen.getByRole('textbox', { name: 'Your question' });
const askButton = () => screen.getByRole('button', { name: 'Ask' });

async function ask(question = 'Which charters are dated?') {
  await screen.findByRole('heading', { name: 'What it can and cannot do' });
  fireEvent.change(box(), { target: { value: question } });
  fireEvent.click(askButton());
}

describe('<AskArchetype>', () => {
  beforeEach(() => {
    services.askArchetype.mockReset();
    services.getAgentTools.mockReset().mockResolvedValue(TOOLS);
  });

  it('says what it can look up and what it cannot yet, and why', async () => {
    renderWithQueryClient(<AskArchetype />);

    const limits = await screen.findByRole('region', { name: 'What it can and cannot do' });
    const [can, cannot] = within(limits).getAllByRole('list');
    expect(
      within(can)
        .getAllByRole('listitem')
        .map((li) => li.textContent)
    ).toEqual([
      'Find charters by the words of their transcription or translation',
      'Check each citation against the record before it is used',
    ]);
    expect(
      within(cannot).getByText('This needs a palaeographic model that has not been trained yet.')
    ).not.toBeNull();
    expect(within(cannot).getByText('Not enabled on this site.')).not.toBeNull();
  });

  it('shows the answer as text, with each source, its claim and where to check it', async () => {
    services.askArchetype.mockResolvedValue(
      run({
        answer: 'Dated <b>1245</b>.\n\nSee **below**.',
        citations: [
          CITED,
          {
            ...CITED,
            claim: 'The O is a closed bowl.',
            image_text_id: 3,
            item_image_id: 106,
            item_part_id: 240,
            type: 'Translation',
            shelfmark: 'Adv. MS 15.1.18, no. 10',
            region: '362,426,140,296',
            verified_region: true,
            graph_id: 132,
          },
          {
            ...CITED,
            claim: 'The grant is in free alms.',
            region: '10,10,50,50',
            verified_region: false,
          },
        ],
      })
    );
    renderWithQueryClient(<AskArchetype />);

    await ask();

    const answer = await screen.findByRole('article', { name: 'Which charters are dated?' });
    expect(services.askArchetype.mock.calls[0][0]).toBe('Which charters are dated?');
    // Model output is text: the tags arrive as typed and no element is made.
    expect(within(answer).getByText('Dated <b>1245</b>.')).not.toBeNull();
    expect(answer.querySelector('b')).toBeNull();

    const sources = within(answer).getAllByRole('listitem');
    expect(within(answer).getByRole('heading', { name: 'Sources (3)' })).not.toBeNull();
    expect(sources[0].textContent).toContain('Cotton Ch. xviii.28, face');
    expect(
      within(sources[0]).getByRole('link', { name: 'Read the transcription' }).getAttribute('href')
    ).toBe('/manuscripts/703/images/7131/texts/599');
    expect(
      within(sources[0]).getByRole('link', { name: 'Open the folio' }).getAttribute('href')
    ).toBe('/manuscripts/703/images/7131');
    expect(
      within(sources[1]).getByRole('link', { name: 'Open the marked place' }).getAttribute('href')
    ).toBe('/manuscripts/240/images/106?graph=132');
    expect(within(sources[1]).getByRole('link', { name: 'Read the translation' })).not.toBeNull();
    expect(within(sources[2]).getByText(/matches no annotation/)).not.toBeNull();
    expect(within(sources[2]).queryByRole('link', { name: 'Open the marked place' })).toBeNull();
  });

  it('moves to the new answer and clears the box for the next question', async () => {
    services.askArchetype.mockResolvedValue(run());
    renderWithQueryClient(<AskArchetype />);

    await ask();

    const heading = await screen.findByRole('heading', { name: 'Which charters are dated?' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect((box() as HTMLTextAreaElement).value).toBe('');
  });

  it('keeps earlier answers below the newest', async () => {
    services.askArchetype
      .mockResolvedValueOnce(run({ id: 1, question: 'First?' }))
      .mockResolvedValueOnce(run({ id: 2, question: 'Second?' }));
    renderWithQueryClient(<AskArchetype />);

    await ask('First?');
    await screen.findByRole('article', { name: 'First?' });
    await ask('Second?');
    await screen.findByRole('article', { name: 'Second?' });

    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-labelledby'))).toEqual([
      'ask-run-2',
      'ask-run-1',
    ]);
    expect(screen.getByRole('heading', { name: 'Earlier questions' })).not.toBeNull();
  });

  it('asks on Enter and starts a new line on Shift+Enter', async () => {
    services.askArchetype.mockResolvedValue(run());
    renderWithQueryClient(<AskArchetype />);
    await screen.findByRole('heading', { name: 'What it can and cannot do' });
    fireEvent.change(box(), { target: { value: 'Which charters are dated?' } });

    fireEvent.keyDown(box(), { key: 'Enter', shiftKey: true });
    expect(services.askArchetype).not.toHaveBeenCalled();

    fireEvent.keyDown(box(), { key: 'Enter' });
    await waitFor(() => expect(services.askArchetype).toHaveBeenCalledTimes(1));
  });

  it('will not send an empty question', async () => {
    renderWithQueryClient(<AskArchetype />);
    await screen.findByRole('heading', { name: 'What it can and cannot do' });

    fireEvent.change(box(), { target: { value: '   ' } });

    expect(askButton().hasAttribute('disabled')).toBe(true);
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(services.askArchetype).not.toHaveBeenCalled();
  });

  it('says it is working while the answer is written, and locks the box', async () => {
    let finish: (value: AgentRun) => void = () => {};
    services.askArchetype.mockReturnValue(new Promise<AgentRun>((resolve) => (finish = resolve)));
    renderWithQueryClient(<AskArchetype />);

    await ask();

    expect(await screen.findByText('Looking it up…')).not.toBeNull();
    expect(screen.getByRole('status').textContent).toMatch(/up to a minute/);
    expect(box().hasAttribute('disabled')).toBe(true);
    finish(run());
    await waitFor(() => expect(screen.queryByText('Looking it up…')).toBeNull());
  });

  it('says plainly when an answer cites nothing', async () => {
    services.askArchetype.mockResolvedValue(run({ citations: [] }));
    renderWithQueryClient(<AskArchetype />);

    await ask();

    expect(
      await screen.findByText(
        'This answer cites no records, so nothing in it has been checked against the corpus.'
      )
    ).not.toBeNull();
  });

  it('keeps the sources found before a run ran out of time', async () => {
    services.askArchetype.mockResolvedValue(run({ status: 'exhausted', answer: '' }));
    renderWithQueryClient(<AskArchetype />);

    await ask();

    expect(await screen.findByText('It stopped before writing an answer.')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Sources (1)' })).not.toBeNull();
  });

  it('says a refused run could not run', async () => {
    services.askArchetype.mockResolvedValue(
      run({
        status: 'refused',
        answer: '',
        citations: [],
      })
    );
    renderWithQueryClient(<AskArchetype />);

    await ask();

    expect(await screen.findByText('Ask Archetype could not run this question.')).not.toBeNull();
    expect(screen.queryByText(/micros/)).toBeNull();
    expect(screen.queryByText(/cites no records/)).toBeNull();
  });

  it('keeps the question when it is turned away, and says why', async () => {
    services.askArchetype.mockRejectedValue(new AskError(429, ''));
    renderWithQueryClient(<AskArchetype />);

    await ask();

    expect(await screen.findByRole('alert')).not.toBeNull();
    expect(screen.getByText(/reached the limit for now/)).not.toBeNull();
    expect((box() as HTMLTextAreaElement).value).toBe('Which charters are dated?');
  });

  it("passes on the service's own reason when it declines", async () => {
    services.askArchetype.mockRejectedValue(
      new AskError(503, 'Daily quota of 200 questions reached; try again tomorrow.')
    );
    renderWithQueryClient(<AskArchetype />);

    await ask();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Ask Archetype cannot take a question right now.');
    expect(alert.textContent).toContain('try again tomorrow');
  });

  it('offers no box while the agent is switched off', async () => {
    services.getAgentTools.mockResolvedValue({ ...TOOLS, enabled: false });
    renderWithQueryClient(<AskArchetype />);

    expect(await screen.findByText('Ask Archetype is switched off')).not.toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('leaves the box open when the tool list cannot be read', async () => {
    services.getAgentTools.mockRejectedValue(new Error('500'));
    renderWithQueryClient(<AskArchetype />);

    expect(await screen.findByText('Could not load what Ask Archetype can do.')).not.toBeNull();
    expect(box()).not.toBeNull();
  });
});
