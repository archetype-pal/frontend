/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TeiTextEditor } from './tei-text-editor';

// The Source/Rich tabs load via next/dynamic; Preview (what we assert here)
// renders ImageTextViewer synchronously, so stub dynamic to keep the module light.
vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

// Preview never hits the validator (token=null short-circuits the effect), but
// mock the service so importing it never reaches real network code.
vi.mock('@/services/image-texts', () => ({
  validateTei: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
}));

describe('TeiTextEditor — Preview mode', () => {
  const VALUE =
    '<p><persName type="name">William</persName> to all, ' +
    '<seg type="salutation">greetings</seg> ' +
    '<seg type="disposition">grants</seg></p>';

  function renderPreview() {
    return render(
      <TeiTextEditor
        value={VALUE}
        onChange={() => {}}
        token={null}
        defaultMode="preview"
        hideSource
      />
    );
  }

  it('renders in type-filter mode (.tei-hl-mode), not the blanket .tei-rich highlight', () => {
    const { container } = renderPreview();
    expect(container.querySelector('.tei-hl-mode')).not.toBeNull();
    expect(container.querySelector('.tei-rich')).toBeNull();
  });

  it('highlights only name + salutation by default (the requested defaults)', () => {
    const { container } = renderPreview();
    // name (persName@type=name) and salutation (seg@type=salutation) → highlighted
    expect(container.querySelector('[data-dpt-type="name"]')?.classList.contains('tei-hl')).toBe(
      true
    );
    expect(
      container.querySelector('[data-dpt-type="salutation"]')?.classList.contains('tei-hl')
    ).toBe(true);
    // disposition is present but NOT in the default set → not highlighted
    expect(
      container.querySelector('[data-dpt-type="disposition"]')?.classList.contains('tei-hl')
    ).toBe(false);
  });

  it('exposes the Highlight dropdown control', () => {
    const { getByLabelText } = renderPreview();
    expect(getByLabelText('Highlight markup types')).toBeTruthy();
  });
});
