/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ItemPartNested } from '@/types/backoffice';

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));

import { ItemPartsTab } from './item-parts-tab';
import { renderWithQueryClient } from '@/test/render';

const part = (id: number, display_label: string): ItemPartNested => ({
  id,
  custom_label: '',
  current_item: null,
  current_item_display: null,
  current_item_locus: '',
  display_label,
  repository: null,
  repository_name: null,
  shelfmark: null,
  images: [],
  msdesc_areas: [],
});

describe('ItemPartsTab', () => {
  it('links each part card to its own public page', () => {
    renderWithQueryClient(
      <ItemPartsTab historicalItemId={3} itemParts={[part(7, 'Part one'), part(8, 'Part two')]} />
    );

    const hrefOf = (name: string) => screen.getByRole('link', { name }).getAttribute('href');
    expect(hrefOf('View the public page of Part one')).toBe('/manuscripts/7');
    expect(hrefOf('View the public page of Part two')).toBe('/manuscripts/8');
  });
});
