/** @vitest-environment jsdom */
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TeiTextEditor } from './tei-text-editor';

// The Source/Rich tabs load via next/dynamic; Preview (what we assert here)
// renders ImageTextViewer synchronously, so stub dynamic to keep the module light.
vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

// Preview never hits the validator (token=null short-circuits the effect), but
// mock the service so importing it never reaches real network code.
const formatTei = vi.fn().mockResolvedValue('<p>\n  laid out\n</p>');
vi.mock('@/services/image-texts', () => ({
  validateTei: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
  formatTei: (...args: unknown[]) => formatTei(...args),
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

describe('TeiTextEditor — Format button', () => {
  const ONE_LINER = '<p><seg type="salutation">greetings</seg> and the rest of a long line</p>';

  it('is offered in Source mode and hands back the formatted text', async () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <TeiTextEditor value={ONE_LINER} onChange={onChange} token="t0ken" defaultMode="source" />
    );

    const button = getByLabelText('Format') as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    button.click();

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('<p>\n  laid out\n</p>'));
    expect(formatTei).toHaveBeenCalledWith(ONE_LINER, 't0ken');
  });

  it('is not offered in Preview mode — there is no source to lay out there', () => {
    const { queryByLabelText } = render(
      <TeiTextEditor value={ONE_LINER} onChange={() => {}} token="t0ken" defaultMode="preview" />
    );
    expect(queryByLabelText('Format')).toBeNull();
  });

  it('stays disabled without a token', () => {
    const { getByLabelText } = render(
      <TeiTextEditor value={ONE_LINER} onChange={() => {}} token={null} defaultMode="source" />
    );
    expect((getByLabelText('Format') as HTMLButtonElement).disabled).toBe(true);
  });
});
