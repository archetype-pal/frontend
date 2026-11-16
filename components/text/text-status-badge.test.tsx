/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>();
  const messages = (await import('@/messages/fr.json')).default;
  return {
    ...actual,
    useTranslations: (namespace?: string) =>
      actual.createTranslator({ locale: 'fr', messages, namespace: namespace as never }),
  };
});

import { TextStatusBadge } from './text-status-badge';

describe('TextStatusBadge', () => {
  it("names the status in the reader's language", () => {
    render(<TextStatusBadge status="Draft" />);

    expect(screen.getByText('Brouillon')).toBeTruthy();
  });
});
