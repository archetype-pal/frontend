/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { BackofficeApiError } from '@/services/backoffice/api-client';
import type { FindOnPageReply } from '@/services/backoffice/annotation-proposals';

const { findOnPage } = vi.hoisted(() => ({ findOnPage: vi.fn() }));
vi.mock('@/services/backoffice/annotation-proposals', () => ({ findOnPage }));

import { FindOnPageControl } from './find-on-page-control';

const longS = { id: 12, name: 'long', character: 's' };
const roundS = { id: 13, name: 'round', character: 's' };

function open() {
  render(
    <TooltipProvider>
      <FindOnPageControl imageId={5504} />
    </TooltipProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Find a letter on this page' }));
}

function ask(text: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'What to find' }), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Find' }));
}

describe('<FindOnPageControl>', () => {
  beforeEach(() => {
    findOnPage.mockReset();
  });

  it('sends the request as written and links the proposals it filed', async () => {
    findOnPage.mockResolvedValue({
      status: 'proposed',
      allograph: longS,
      hand: 3,
      examples: 4,
      job: 31,
      proposed: 12,
    } satisfies FindOnPageReply);
    open();

    ask('  label every long s on this folio ');

    expect(
      await screen.findByText('Proposed 12 places for s, long, from the 4 marked here.')
    ).not.toBeNull();
    expect(findOnPage).toHaveBeenCalledWith(5504, { request: 'label every long s on this folio' });
    const link = screen.getByRole('link', { name: 'Review the proposals' });
    expect(link.getAttribute('href')).toBe('/backoffice/annotation-proposals?ml_job=31');
  });

  it('says when the search found nothing more, with nothing to review', async () => {
    findOnPage.mockResolvedValue({
      status: 'proposed',
      allograph: longS,
      hand: null,
      examples: 4,
      job: 32,
      proposed: 0,
    } satisfies FindOnPageReply);
    open();

    ask('long s');

    expect(
      await screen.findByText('Found no more places for s, long on this page.')
    ).not.toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('asks which letter was meant, and searches the one picked', async () => {
    findOnPage
      .mockResolvedValueOnce({
        status: 'ask',
        options: [
          { allograph: longS, examples: 4 },
          { allograph: roundS, examples: 2 },
        ],
      } satisfies FindOnPageReply)
      .mockResolvedValueOnce({
        status: 'proposed',
        allograph: roundS,
        hand: 3,
        examples: 2,
        job: 33,
        proposed: 1,
      } satisfies FindOnPageReply);
    open();

    ask('every s');
    expect(await screen.findByText('Which letter do you mean?')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 's, round (2)' }));

    expect(
      await screen.findByText('Proposed 1 place for s, round, from the 2 marked here.')
    ).not.toBeNull();
    expect(findOnPage).toHaveBeenLastCalledWith(5504, { allograph: 13 });
  });

  it('holds the options while the letter picked is searched', async () => {
    let answer: (reply: FindOnPageReply) => void = () => {};
    findOnPage
      .mockResolvedValueOnce({
        status: 'ask',
        options: [
          { allograph: longS, examples: 4 },
          { allograph: roundS, examples: 2 },
        ],
      } satisfies FindOnPageReply)
      .mockReturnValueOnce(new Promise<FindOnPageReply>((resolve) => (answer = resolve)));
    open();

    ask('every s');
    fireEvent.click(await screen.findByRole('button', { name: 's, long (4)' }));

    const other = screen.getByRole('button', { name: 's, round (2)' });
    await waitFor(() => expect(other.hasAttribute('disabled')).toBe(true));
    fireEvent.click(other);
    expect(findOnPage).toHaveBeenCalledTimes(2);
    answer({ status: 'cannot', reason: 'unknown_letter', options: [] });
    expect(await screen.findByText(/No letters are marked on this page yet/)).not.toBeNull();
  });

  it('offers the letters marked on the page when it does not know the one asked for', async () => {
    findOnPage.mockResolvedValue({
      status: 'cannot',
      reason: 'unknown_letter',
      options: [{ allograph: longS, examples: 4 }],
    } satisfies FindOnPageReply);
    open();

    ask('every thorn');

    expect(
      await screen.findByText('None of the letters marked on this page matches that. Pick one:')
    ).not.toBeNull();
    expect(screen.getByRole('button', { name: 's, long (4)' })).not.toBeNull();
  });

  it('says a page with no letters marked has nothing to search by', async () => {
    findOnPage.mockResolvedValue({
      status: 'cannot',
      reason: 'unknown_letter',
      options: [],
    } satisfies FindOnPageReply);
    open();

    ask('every thorn');

    expect(
      await screen.findByText(
        'No letters are marked on this page yet. Mark a few examples first; the search starts from them.'
      )
    ).not.toBeNull();
  });

  it('says how many more examples to mark when there are too few', async () => {
    findOnPage.mockResolvedValue({
      status: 'cannot',
      reason: 'too_few_examples',
      allograph: roundS,
      examples: 1,
      minimum: 2,
    } satisfies FindOnPageReply);
    open();

    ask('round s');

    expect(
      await screen.findByText(
        's, round is marked once on this page; the search needs at least 2 examples to start from.'
      )
    ).not.toBeNull();
  });

  it('says when the page is too large to search', async () => {
    findOnPage.mockResolvedValue({
      status: 'cannot',
      reason: 'page_too_large',
      allograph: longS,
      side: 9000,
      maximum: 6000,
    } satisfies FindOnPageReply);
    open();

    ask('long s');

    expect(
      await screen.findByText('This page is too large to search at the size s, long is written.')
    ).not.toBeNull();
  });

  it('shows why the search could not run', async () => {
    findOnPage.mockRejectedValue(
      new BackofficeApiError(503, { detail: 'Inference is switched off.', job: 34 })
    );
    open();

    ask('long s');

    expect(
      await screen.findByText('The search could not run: Inference is switched off.')
    ).not.toBeNull();
  });

  it('sends nothing until there is a request, and nothing twice while one is out', async () => {
    let answer: (reply: FindOnPageReply) => void = () => {};
    findOnPage.mockReturnValue(new Promise<FindOnPageReply>((resolve) => (answer = resolve)));
    open();

    const find = screen.getByRole('button', { name: 'Find' });
    expect(find.hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByRole('textbox', { name: 'What to find' }), {
      target: { value: '   ' },
    });
    // A submit never reloads the page, whatever is typed.
    expect(fireEvent.submit(find.closest('form') as HTMLFormElement)).toBe(false);
    expect(findOnPage).not.toHaveBeenCalled();

    ask('long s');
    await waitFor(() => expect(find.hasAttribute('disabled')).toBe(true));
    fireEvent.submit(find.closest('form') as HTMLFormElement);
    expect(findOnPage).toHaveBeenCalledTimes(1);

    answer({ status: 'ask', options: [{ allograph: longS, examples: 4 }] });
    expect(await screen.findByText('Which letter do you mean?')).not.toBeNull();
    expect(find.hasAttribute('disabled')).toBe(false);
  });
});
