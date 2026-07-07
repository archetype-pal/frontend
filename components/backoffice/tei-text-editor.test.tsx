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
  it('renders TEI entity highlighting (.tei-rich) so Preview matches Rich (edit) mode', () => {
    const { container } = render(
      <TeiTextEditor
        value={'<p>Charter of <persName>William</persName> of Scotland</p>'}
        onChange={() => {}}
        token={null}
        defaultMode="preview"
        hideSource
      />
    );

    // Regression: Preview used to render a bare <ImageTextViewer> (no richMarkup),
    // so entity highlighting was absent in view mode while present in Rich mode.
    // The rendered transcription now opts into the `.tei-rich` styling...
    expect(container.querySelector('.tei-rich')).not.toBeNull();
    // ...which is what colours/labels the person entity (was plain prose before).
    expect(container.querySelector('.tei-el-persName')).not.toBeNull();
  });
});
