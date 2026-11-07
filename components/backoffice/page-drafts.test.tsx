/** @vitest-environment jsdom */
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PageDraftButton, useDraftsUnderWay, type DraftablePage } from './page-drafts';
import { BackofficeApiError } from '@/services/backoffice/api-client';
import { getMLJobSummary } from '@/services/backoffice/ml-jobs';
import {
  fetchDraftsUnderWay,
  fetchPageDraft,
  requestPageDraft,
} from '@/services/backoffice/page-drafts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { renderWithQueryClient } from '@/test/render';
import type { MLJobSummary, PageDraft } from '@/types/backoffice';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('@/services/backoffice/ml-jobs', () => ({ getMLJobSummary: vi.fn() }));
vi.mock('@/services/backoffice/page-drafts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/backoffice/page-drafts')>()),
  requestPageDraft: vi.fn(),
  fetchPageDraft: vi.fn(),
  fetchDraftsUnderWay: vi.fn(),
}));

const PAGE: DraftablePage = { id: 70, image: null, locus: 'Cott. Ch. xviii 23' };

function draft(fields: Partial<PageDraft> = {}): PageDraft {
  return {
    id: 2,
    item_image: PAGE.id,
    status: 'queued',
    error: '',
    requested_by: 'ahmed',
    image_text: null,
    ml_job: null,
    cost_micros: null,
    created: '2026-11-05T16:21:34Z',
    updated: '2026-11-05T16:21:34Z',
    ...fields,
  };
}

function switches(on: boolean) {
  vi.mocked(getMLJobSummary).mockResolvedValue({
    inference_enabled: on,
    hosted_providers_enabled: on,
  } as MLJobSummary);
}

/** One row of the uncovered list, as it uses the button. */
function Row() {
  const { byPage, draftingOn } = useDraftsUnderWay();
  return <PageDraftButton page={PAGE} draft={byPage.get(PAGE.id)} draftingOn={draftingOn} />;
}

/** The action button a toast was given. */
function actionOf(options: unknown) {
  return (options as { action: { label: string; onClick: () => void } }).action;
}

const button = () => screen.getByRole('button', { name: 'Draft with AI' }) as HTMLButtonElement;

beforeEach(() => {
  vi.clearAllMocks();
  switches(true);
  vi.mocked(fetchDraftsUnderWay).mockResolvedValue([]);
});

describe('<PageDraftButton>', () => {
  it('is disabled, saying why, while drafting is switched off', async () => {
    switches(false);
    renderWithQueryClient(<Row />);

    await waitFor(() => expect(button().disabled).toBe(true));
    expect(button().title).toBe('Drafting with a model is switched off on this server.');
  });

  it('asks first, with what the draft will be and what it costs, and drafts only on confirming', async () => {
    vi.mocked(requestPageDraft).mockResolvedValue(draft());
    renderWithQueryClient(<Row />);

    fireEvent.click(button());
    expect(screen.getByText('Draft a transcription of page #70?')).toBeTruthy();
    expect(screen.getByText('It takes a minute or two and costs about $0.28.')).toBeTruthy();
    expect(screen.getByText(/Nothing is published until someone approves it/)).toBeTruthy();
    expect(requestPageDraft).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Draft this page' }));

    await waitFor(() => expect(requestPageDraft).toHaveBeenCalledWith(70));
    expect(await screen.findByText('Drafting…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Draft with AI' })).toBeNull();
  });

  it('cancelling asks for nothing', () => {
    renderWithQueryClient(<Row />);

    fireEvent.click(button());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(requestPageDraft).not.toHaveBeenCalled();
    expect(screen.queryByText('Draft a transcription of page #70?')).toBeNull();
  });

  it('shows a draft already under way, started here or elsewhere', async () => {
    vi.mocked(fetchDraftsUnderWay).mockResolvedValue([draft({ status: 'working' })]);
    renderWithQueryClient(<Row />);

    expect(await screen.findByText('Drafting…')).toBeTruthy();
  });

  it('follows a draft someone else asked for first', async () => {
    vi.mocked(requestPageDraft).mockRejectedValue(
      new BackofficeApiError(409, {
        detail: 'This page is already being drafted.',
        draft: draft({ id: 9, status: 'working' }),
      })
    );
    renderWithQueryClient(<Row />);

    fireEvent.click(button());
    fireEvent.click(screen.getByRole('button', { name: 'Draft this page' }));

    expect(await screen.findByText('Drafting…')).toBeTruthy();
    expect(toast.info).toHaveBeenCalledWith('Page #70 is already being drafted.');
  });

  it('points to the transcription a page already has', async () => {
    vi.mocked(requestPageDraft).mockRejectedValue(
      new BackofficeApiError(409, {
        detail: 'This page already has a transcription.',
        image_text: 31,
      })
    );
    renderWithQueryClient(<Row />);

    fireEvent.click(button());
    fireEvent.click(screen.getByRole('button', { name: 'Draft this page' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    const [message, options] = vi.mocked(toast.error).mock.calls[0];
    expect(message).toBe('Page #70 already has a transcription.');
    actionOf(options).onClick();
    expect(push).toHaveBeenCalledWith('/backoffice/image-texts/31');
    expect(button()).toBeTruthy();
  });

  it('says why drafting could not start', async () => {
    vi.mocked(requestPageDraft).mockRejectedValue(
      new BackofficeApiError(429, { detail: 'Drafting is paused: Daily spend cap reached.' })
    );
    renderWithQueryClient(<Row />);

    fireEvent.click(button());
    fireEvent.click(screen.getByRole('button', { name: 'Draft this page' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Could not start drafting page #70', {
        description: 'Drafting is paused: Daily spend cap reached.',
      })
    );
  });
});

describe('useDraftsUnderWay', () => {
  async function finish(outcome: PageDraft) {
    vi.mocked(fetchDraftsUnderWay).mockResolvedValue([draft({ status: 'working' })]);
    const { client } = renderWithQueryClient(<Row />);
    await screen.findByText('Drafting…');

    vi.mocked(fetchDraftsUnderWay).mockResolvedValue([]);
    vi.mocked(fetchPageDraft).mockResolvedValue(outcome);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    await act(() => client.refetchQueries({ queryKey: backofficeKeys.pageDrafts.active() }));
    return invalidate;
  }

  it('says when a draft is done, with the way to it, and refreshes the lists', async () => {
    const invalidate = await finish(draft({ status: 'drafted', image_text: 900 }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(fetchPageDraft).toHaveBeenCalledWith(70);
    const [message, options] = vi.mocked(toast.success).mock.calls[0];
    expect(message).toBe('Page #70 is drafted and waits in the review queue.');
    const action = actionOf(options);
    expect(action.label).toBe('Open draft');
    action.onClick();
    expect(push).toHaveBeenCalledWith('/backoffice/image-texts/900');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: backofficeKeys.uncoveredImages.all() });
    expect(await screen.findByRole('button', { name: 'Draft with AI' })).toBeTruthy();
  });

  it('says why a draft failed', async () => {
    await finish(draft({ status: 'failed', error: "The page's image could not be fetched." }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Page #70 could not be drafted', {
        description: "The page's image could not be fetched.",
      })
    );
  });

  it('says when the model was not asked', async () => {
    await finish(draft({ status: 'refused', error: 'The model was not asked: cap reached.' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Page #70 was not drafted', {
        description: 'The model was not asked: cap reached.',
      })
    );
  });
});
