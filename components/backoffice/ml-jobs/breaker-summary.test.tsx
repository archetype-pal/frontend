import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BreakerSummary } from './breaker-summary';
import type { MLJobSummary } from '@/types/backoffice';

function summary(overrides: Partial<MLJobSummary> = {}): MLJobSummary {
  return {
    inference_enabled: true,
    hosted_providers_enabled: false,
    window: '24h',
    spend_micros: 0,
    cap_micros: 0,
    per_actor_cap_micros: 0,
    currencies: [],
    by_status: { pending: 0, running: 0, succeeded: 0, failed: 0, refused: 0 },
    tasks: [],
    ...overrides,
  };
}

describe('<BreakerSummary>', () => {
  it.each([
    [{ inference_enabled: false }, /Inference is switched off\. No model runs/],
    [{ hosted_providers_enabled: false }, /Hosted providers are off, so nothing is sent outside/],
    [{ hosted_providers_enabled: true }, /hosted providers may be called/],
  ])('says what the switches allow (%o)', (switches, sentence) => {
    render(<BreakerSummary summary={summary(switches)} />);

    expect(screen.getByText(sentence)).not.toBeNull();
  });

  it('measures the spend against the daily cap', () => {
    render(
      <BreakerSummary
        summary={summary({ spend_micros: 4_000_000, cap_micros: 5_000_000, currencies: ['USD'] })}
      />
    );

    expect(screen.getByText(/\$4\.00 spent of a \$5\.00 daily cap \(80%\)\./)).not.toBeNull();
    const meter = screen.getByRole('meter', { name: 'Share of the daily cap spent' });
    expect(meter.getAttribute('aria-valuenow')).toBe('4000000');
    expect(meter.getAttribute('aria-valuemax')).toBe('5000000');
  });

  it('holds the meter at the cap once spend passes it', () => {
    render(
      <BreakerSummary summary={summary({ spend_micros: 9_000_000, cap_micros: 5_000_000 })} />
    );

    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('5000000');
    expect(screen.getByText(/\(180%\)/)).not.toBeNull();
  });

  it('says when no cap is set, and states a per-person cap', () => {
    render(
      <BreakerSummary summary={summary({ per_actor_cap_micros: 1_000_000, currencies: ['USD'] })} />
    );

    expect(screen.getByText('No daily cap is set, so hosted providers are refused.')).not.toBeNull();
    expect(screen.queryByRole('meter')).toBeNull();
    expect(screen.getByText('Each person may spend up to $1.00 a day.')).not.toBeNull();
  });

  it('warns when the caps add costs in more than one currency, and names none of them', () => {
    render(
      <BreakerSummary summary={summary({ spend_micros: 2_500_000, currencies: ['EUR', 'USD'] })} />
    );

    expect(screen.getByText(/2\.50 spent/).textContent).not.toMatch(/[$€]/);
    expect(screen.getByText(/These costs are in EUR, USD/)).not.toBeNull();
  });

  it('lists only the outcomes that happened, and explains a refusal', () => {
    render(
      <BreakerSummary
        summary={summary({
          by_status: { pending: 0, running: 0, succeeded: 12, failed: 0, refused: 3 },
        })}
      />
    );

    expect(screen.getByText('12 succeeded')).not.toBeNull();
    expect(screen.getByText('3 refused')).not.toBeNull();
    expect(screen.queryByText(/failed/)).toBeNull();
    expect(screen.getByText(/stopped by a cap or a switch before any provider/)).not.toBeNull();
  });

  it('says when nothing was called', () => {
    render(<BreakerSummary summary={summary()} />);

    expect(screen.getByText('No model was called in the last 24 hours.')).not.toBeNull();
    expect(screen.queryByText(/stopped by a cap/)).toBeNull();
  });
});
