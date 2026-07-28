/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { msdescTemplateFragment } from '@/lib/msdesc-template';
import { MSDESC_AREAS } from '@/lib/msdesc-vocab';
import type { MsDescArea } from '@/types/backoffice';
import { MsDescAreaPanel } from './msdesc-area-panel';

// The Source tab loads CodeMirror via next/dynamic; keep the module light.
vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ token: 'tok' }),
}));

vi.mock('@/services/backoffice/manuscripts', () => ({
  updateMsDescArea: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/services/image-texts', () => ({
  validateTei: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
}));

function renderPanel(row: MsDescArea) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MsDescAreaPanel historicalItemId={1} area={row.area} row={row} />
    </QueryClientProvider>
  );
}

const REPRESENTABLE: MsDescArea = {
  id: 11,
  item_part: 5,
  area: 'msIdentifier',
  content: msdescTemplateFragment('msIdentifier'),
  is_published: false,
};

const UNREPRESENTABLE: MsDescArea = {
  ...REPRESENTABLE,
  content: '<msIdentifier>\n  <sealDesc>wax</sealDesc>\n</msIdentifier>',
};

describe('MsDescAreaPanel — representability gate (data-safety contract)', () => {
  it('representable fragment: Form view active, no fallback banner', () => {
    renderPanel(REPRESENTABLE);
    const formTab = screen.getByRole('radio', { name: 'Form' }) as HTMLButtonElement;
    expect(formTab.disabled).toBe(false);
    expect(formTab.getAttribute('aria-checked')).toBe('true');
    // The typed form renders (msIdentifier field labels present).
    expect(screen.getByText('Country')).toBeTruthy();
    expect(screen.getByText('Shelfmark')).toBeTruthy();
    expect(screen.queryByText('Structured form unavailable')).toBeNull();
  });

  it('unrepresentable fragment: Form disabled with banner, Source becomes the surface', () => {
    renderPanel(UNREPRESENTABLE);
    const formTab = screen.getByRole('radio', { name: 'Form' }) as HTMLButtonElement;
    expect(formTab.disabled).toBe(true);
    // Effective view falls back to Source (derived, not chased by effects).
    const sourceTab = screen.getByRole('radio', { name: 'Source' });
    expect(sourceTab.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Structured form unavailable')).toBeTruthy();
    // The diagnostic reason is surfaced for the cataloguer.
    expect(screen.getByText(/sealDesc/)).toBeTruthy();
    // No typed form fields rendered.
    expect(screen.queryByText('Country')).toBeNull();
  });

  it.each(MSDESC_AREAS)('renders the typed form for a seeded %s area', (area) => {
    renderPanel({
      id: 20,
      item_part: 5,
      area,
      content: msdescTemplateFragment(area),
      is_published: false,
    });
    const formTab = screen.getByRole('radio', { name: 'Form' }) as HTMLButtonElement;
    expect(formTab.disabled).toBe(false);
    expect(formTab.getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByText('Structured form unavailable')).toBeNull();
  });

  it('publish-only toggle enables Save without waiting for validation', () => {
    renderPanel(REPRESENTABLE);
    const save = screen.getByRole('button', { name: /Save/ }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Published' }));
    expect(save.disabled).toBe(false);
    expect(screen.getByText('Unsaved changes')).toBeTruthy();
  });
});
