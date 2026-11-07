/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MLJobsPage from './page';
import { renderWithQueryClient } from '@/test/render';
import type { MLJobDetail, MLJobListItem, MLJobSummary } from '@/types/backoffice';

const services = vi.hoisted(() => ({
  getMLJobs: vi.fn(),
  getMLJob: vi.fn(),
  getMLJobSummary: vi.fn(),
}));

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('@/services/backoffice/ml-jobs', () => services);

function job(id: number, overrides: Partial<MLJobListItem> = {}): MLJobListItem {
  return {
    id,
    task: 'W2.1',
    provider: 'openrouter',
    model_name: 'anthropic/claude-fable-5-1',
    model_version: '2026-10',
    status: 'succeeded',
    cost_micros: 4210,
    cost_currency: 'USD',
    duration_ms: 8420,
    created: '2026-11-04T00:00:00Z',
    ...overrides,
  };
}

function detail(base: MLJobListItem, overrides: Partial<MLJobDetail> = {}): MLJobDetail {
  return {
    ...base,
    prompt_hash: 'a'.repeat(64),
    input_ref: 'b'.repeat(64),
    params: { max_tokens: 4000 },
    error: '',
    input_tokens: 2210,
    output_tokens: 380,
    actor: 1,
    actor_username: 'ahmed',
    celery_task_id: '',
    targets: [],
    ...overrides,
  };
}

const SUMMARY: MLJobSummary = {
  inference_enabled: false,
  hosted_providers_enabled: false,
  window: '24h',
  spend_micros: 8080,
  cap_micros: 0,
  per_actor_cap_micros: 0,
  currencies: ['USD'],
  by_status: { pending: 0, running: 0, succeeded: 2, failed: 0, refused: 1 },
  tasks: [
    { task: 'W2.1', count: 2 },
    { task: 'W3.2', count: 1 },
  ],
};

const page = (results: MLJobListItem[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

const renderPage = () => renderWithQueryClient(<MLJobsPage />);
const rows = () => screen.getAllByRole('row').slice(1);

describe('<MLJobsPage>', () => {
  beforeEach(() => {
    services.getMLJobs.mockReset();
    services.getMLJob.mockReset();
    services.getMLJobSummary.mockReset().mockResolvedValue(SUMMARY);
  });

  it('lists the calls, newest first as the ledger gives them, under the breaker', async () => {
    services.getMLJobs.mockResolvedValue(
      page([
        job(2, {
          task: 'W3.2',
          status: 'refused',
          cost_micros: 0,
          cost_currency: '',
          duration_ms: null,
        }),
        job(1),
      ])
    );
    renderPage();

    expect(await screen.findByText(/Inference is switched off/)).not.toBeNull();
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(services.getMLJobs).toHaveBeenCalledWith({ limit: 50, offset: 0 });
    const [refused, succeeded] = rows();
    expect(within(refused).getByText('Refused')).not.toBeNull();
    expect(within(refused).getAllByText('—')).toHaveLength(2);
    expect(within(succeeded).getByText('$0.0042')).not.toBeNull();
    expect(within(succeeded).getByText('8.4 s')).not.toBeNull();
  });

  it('filters by outcome', async () => {
    services.getMLJobs.mockResolvedValue(page([job(1)]));
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));

    fireEvent.click(screen.getByRole('radio', { name: 'Refused' }));

    await waitFor(() =>
      expect(services.getMLJobs).toHaveBeenLastCalledWith({
        limit: 50,
        offset: 0,
        status: 'refused',
      })
    );
  });

  it('filters by task, listing each task the ledger has seen with its count', async () => {
    services.getMLJobs.mockResolvedValue(page([job(1)]));
    renderPage();
    await screen.findByText(/Inference is switched off/);

    fireEvent.click(await screen.findByRole('combobox', { name: 'Task' }));
    expect(await screen.findByRole('option', { name: 'W2.1 (2)' })).not.toBeNull();
    fireEvent.click(screen.getByRole('option', { name: 'W3.2 (1)' }));

    await waitFor(() =>
      expect(services.getMLJobs).toHaveBeenLastCalledWith({ limit: 50, offset: 0, task: 'W3.2' })
    );
  });

  it('opens a call in full: tokens, fingerprints, who asked, and the records it touched', async () => {
    const row = job(5, { task: 'W1.4' });
    services.getMLJobs.mockResolvedValue(page([row]));
    services.getMLJob.mockResolvedValue(
      detail(row, {
        targets: [
          { target_type: 'imagetext', target_id: 61 },
          { target_type: 'graph', target_id: 9 },
        ],
      })
    );
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: 'Details of call 5' }));

    const sheet = await screen.findByRole('dialog');
    expect(await within(sheet).findByText('2210 in, 380 out')).not.toBeNull();
    expect(services.getMLJob).toHaveBeenCalledWith(5);
    expect(within(sheet).getByText('a'.repeat(64))).not.toBeNull();
    expect(within(sheet).getByText('ahmed')).not.toBeNull();
    expect(within(sheet).getByRole('link', { name: 'imagetext #61' }).getAttribute('href')).toBe(
      '/backoffice/image-texts/61'
    );
    expect(within(sheet).getByText('graph #9').closest('a')).toBeNull();
    expect(
      within(sheet).getByText(/what this call proposed waits in the review queues/)
    ).not.toBeNull();
  });

  it("gives a refused call's reason, and does not claim it proposed anything", async () => {
    const row = job(6, { status: 'refused', cost_micros: 0, cost_currency: '' });
    services.getMLJobs.mockResolvedValue(page([row]));
    services.getMLJob.mockResolvedValue(
      detail(row, {
        error: 'Daily spend cap reached (50000 micros over 24h).',
        actor: null,
        actor_username: '',
      })
    );
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: 'Details of call 6' }));

    const sheet = await screen.findByRole('dialog');
    expect(await within(sheet).findByText('Why it was refused')).not.toBeNull();
    expect(within(sheet).getByText(/Daily spend cap reached/)).not.toBeNull();
    expect(within(sheet).getByText('The system')).not.toBeNull();
    expect(within(sheet).getByText('The call reported none.')).not.toBeNull();
    expect(within(sheet).queryByText(/waits in the review queues/)).toBeNull();
  });
});
