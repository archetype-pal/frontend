/** @vitest-environment jsdom */
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TeiRichEditor from './tei-rich-editor';

const editable = (container: HTMLElement) => container.querySelector('[contenteditable="true"]');

describe('TeiRichEditor', () => {
  it('opens TEI the model holds byte for byte', async () => {
    const { container } = render(
      <TeiRichEditor value='<p><seg type="address">Omnibus</seg></p>' onChange={vi.fn()} />
    );

    await waitFor(() => expect(editable(container)).not.toBeNull());
  });

  it('refuses TEI the model would reshape, whatever its host decided', async () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <TeiRichEditor value="<provenance><p>x</p></provenance>" onChange={onChange} />
    );

    // The same element opens once its value passes, so the editor exists by now.
    rerender(<TeiRichEditor value="<p>x</p>" onChange={onChange} />);
    await waitFor(() => expect(editable(container)).not.toBeNull());
    rerender(<TeiRichEditor value="<provenance><p>x</p></provenance>" onChange={onChange} />);

    await waitFor(() => expect(editable(container)).toBeNull());
    expect(onChange).not.toHaveBeenCalled();
  });
});
