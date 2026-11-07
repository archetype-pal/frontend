/** @vitest-environment jsdom */
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PageLettersSection, useLettersUnderWay } from './page-letters';
import { BackofficeApiError } from '@/services/backoffice/api-client';
import { getMLJobSummary } from '@/services/backoffice/ml-jobs';
import {
  fetchLatestPageLetters,
  fetchLettersUnderWay,
  fetchPageLetters,
  requestPageLetters,
} from '@/services/backoffice/page-letters';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { renderWithQueryClient } from '@/test/render';
import type { LetterRequest, MLJobSummary } from '@/types/backoffice';

const { push, session } = vi.hoisted(() => ({
  push: vi.fn(),
  session: { manage: true },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { capabilities: { manage: session.manage } } }),
}));
vi.mock('@/services/backoffice/ml-jobs', () => ({ getMLJobSummary: vi.fn() }));
vi.mock('@/services/backoffice/page-letters', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/backoffice/page-letters')>()),
  requestPageLetters: vi.fn(),
  fetchPageLetters: vi.fn(),
  fetchLatestPageLetters: vi.fn(),
  fetchLettersUnderWay: vi.fn(),
}));

const PAGE = 64;

function run(fields: Partial<LetterRequest> = {}): LetterRequest {
  return {
    id: 2,
    item_image: PAGE,
    status: 'queued',
    error: '',
    requested_by: 'ahmed',
    ml_job: null,
    found: 0,
    proposed: 0,
    created: '2026-11-06T00:00:00Z',
    updated: '2026-11-06T00:00:00Z',
    ...fields,
  };
}

function inference(on: boolean) {
  vi.mocked(getMLJobSummary).mockResolvedValue({
    inference_enabled: on,
    hosted_providers_enabled: false,
  } as MLJobSummary);
}

/** A page's dialog, as the manuscript workspace gives it the requests it follows. */
function Workspace() {
  const { byPage, lettersOn, canManage } = useLettersUnderWay();
  if (!canManage) return <p>No letters here</p>;
  return <PageLettersSection pageId={PAGE} run={byPage.get(PAGE)} lettersOn={lettersOn} />;
}

function actionOf(options: unknown) {
  return (options as { action: { label: string; onClick: () => void } }).action;
}

const button = () => screen.getByRole('button', { name: 'Propose letters' }) as HTMLButtonElement;

beforeEach(() => {
  vi.clearAllMocks();
  session.manage = true;
  inference(true);
  vi.mocked(fetchLettersUnderWay).mockResolvedValue([]);
  vi.mocked(fetchLatestPageLetters).mockResolvedValue(null);
});

describe('<PageLettersSection>', () => {
  it('asks for the page’s letters and follows the request', async () => {
    vi.mocked(requestPageLetters).mockResolvedValue(run());
    renderWithQueryClient(<Workspace />);

    await waitFor(() => expect(button().disabled).toBe(false));
    fireEvent.click(button());

    await waitFor(() => expect(requestPageLetters).toHaveBeenCalledWith(PAGE));
    expect(await screen.findByText('Proposing letters…')).toBeTruthy();
    expect(toast.info).toHaveBeenCalledWith(
      "Page #64's letters are being proposed. You will be told when they are in the queue."
    );
  });

  it('is disabled while inference is switched off, saying why', async () => {
    inference(false);
    renderWithQueryClient(<Workspace />);

    await waitFor(() => expect(button().disabled).toBe(true));
    expect(
      screen.getByText('Proposing letters with a model is switched off on this server.')
    ).toBeTruthy();
  });

  it('follows a request someone else made first', async () => {
    vi.mocked(requestPageLetters).mockRejectedValue(
      new BackofficeApiError(409, { detail: 'busy', run: run({ id: 9, status: 'working' }) })
    );
    renderWithQueryClient(<Workspace />);

    fireEvent.click(button());

    expect(await screen.findByText('Proposing letters…')).toBeTruthy();
    expect(toast.info).toHaveBeenCalledWith("Page #64's letters are already being proposed.");
  });

  it('says why the request could not start', async () => {
    vi.mocked(requestPageLetters).mockRejectedValue(
      new BackofficeApiError(503, {
        detail: 'The reader on this server has no letter models installed.',
      })
    );
    renderWithQueryClient(<Workspace />);

    fireEvent.click(button());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Could not start proposing page #64's letters", {
        description: 'The reader on this server has no letter models installed.',
      })
    );
    expect(button()).toBeTruthy();
  });

  it('says how the last request went, with a link to its proposals', async () => {
    vi.mocked(fetchLatestPageLetters).mockResolvedValue(
      run({ status: 'proposed', found: 212, proposed: 3, ml_job: 31 })
    );
    renderWithQueryClient(<Workspace />);

    const link = await screen.findByRole('link', { name: 'Review them' });
    expect(link.getAttribute('href')).toBe('/backoffice/annotation-proposals?ml_job=31');
    expect(screen.getByText(/Last time, 3 letters were proposed/)).toBeTruthy();
  });

  it('says why the last request stopped', async () => {
    vi.mocked(fetchLatestPageLetters).mockResolvedValue(
      run({ status: 'failed', error: "The page's image could not be fetched for the models." })
    );
    renderWithQueryClient(<Workspace />);

    expect(
      await screen.findByText(
        /Last time it stopped: The page's image could not be fetched for the models\./
      )
    ).toBeTruthy();
  });

  it('asks nothing for a user who cannot propose letters', async () => {
    session.manage = false;
    renderWithQueryClient(<Workspace />);

    expect(screen.getByText('No letters here')).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchLettersUnderWay).not.toHaveBeenCalled();
    expect(getMLJobSummary).not.toHaveBeenCalled();
  });
});

describe('useLettersUnderWay', () => {
  async function finish(outcome: LetterRequest) {
    vi.mocked(fetchLettersUnderWay).mockResolvedValue([run({ status: 'working' })]);
    const { client } = renderWithQueryClient(<Workspace />);
    await screen.findByText('Proposing letters…');

    vi.mocked(fetchLettersUnderWay).mockResolvedValue([]);
    vi.mocked(fetchPageLetters).mockResolvedValue(outcome);
    vi.mocked(fetchLatestPageLetters).mockResolvedValue(outcome);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    await act(() => client.refetchQueries({ queryKey: backofficeKeys.pageLetters.active() }));
    return invalidate;
  }

  it('says when the letters are in the queue, with the way to them', async () => {
    const invalidate = await finish(
      run({ status: 'proposed', found: 212, proposed: 3, ml_job: 31 })
    );

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const [message, options] = vi.mocked(toast.success).mock.calls[0];
    expect(message).toBe('3 letters from page #64 wait in the review queue.');
    const action = actionOf(options);
    expect(action.label).toBe('Review');
    action.onClick();
    expect(push).toHaveBeenCalledWith('/backoffice/annotation-proposals?ml_job=31');
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: backofficeKeys.annotationProposals.all(),
    });
    // The page's dialog says so too: a toast's link cannot be followed through a dialog.
    expect(await screen.findByRole('link', { name: 'Review them' })).toBeTruthy();
  });

  it('says when nothing was worth proposing', async () => {
    await finish(run({ status: 'proposed', found: 212, proposed: 0, ml_job: 31 }));

    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith(
        'The models found nothing on page #64 worth proposing.',
        {
          description:
            'They read 212 letters, but those are marked already, or they were not sure of them.',
        }
      )
    );
  });

  it('says why the request failed', async () => {
    await finish(run({ status: 'failed', error: 'The letter models failed: timeout' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Page #64's letters could not be proposed", {
        description: 'The letter models failed: timeout',
      })
    );
  });
});
