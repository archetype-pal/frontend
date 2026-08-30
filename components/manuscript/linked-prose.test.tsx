/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LinkedProse } from './linked-prose';

const PERSON_LINK =
  '<p>Granted by <a href="/scribes/1" class="tei-el tei-el-persName" ' +
  'data-tei-label="persName" data-ref-kind="person" data-ref-key="person_1">William I</a>.</p>';
const PLACE_LINK =
  '<p>at <a href="/search/places?keyword=Melrose" class="tei-el tei-el-ref" ' +
  'data-ref-kind="place">Melrose</a>.</p>';

function renderProse(html: string, gloss = true) {
  return render(<LinkedProse html={html} gloss={gloss} className="tei-linked-prose" />);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubScribe(body: Record<string, unknown>) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('LinkedProse', () => {
  it('renders the prose it is given', () => {
    renderProse(PERSON_LINK);
    expect(screen.getByRole('link', { name: 'William I' })).toBeTruthy();
  });

  it('glosses a person on hover, from the existing public scribes endpoint', async () => {
    const fetchMock = stubScribe({
      id: 1,
      name: 'Barrow, Scribe Ab',
      period: 'c. 1165–1177',
      scriptorium: 'Melrose',
      idiographs: [{ id: 1 }, { id: 2 }],
    });
    renderProse(PERSON_LINK);

    fireEvent.mouseOver(screen.getByRole('link', { name: 'William I' }));

    expect(await screen.findByText('Barrow, Scribe Ab')).toBeTruthy();
    expect(screen.getByText(/c\. 1165–1177 · Melrose/)).toBeTruthy();
    expect(screen.getByText('2 recorded letter-forms')).toBeTruthy();
    expect(JSON.stringify(fetchMock.mock.calls)).toContain('/api/v1/scribes/1/');
  });

  it('shows the link text while the gloss is still loading', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {}))
    );
    // A person the cache has not seen: glosses are cached for the session, which
    // is right in a browser and would otherwise hide the loading state here.
    renderProse(
      PERSON_LINK.replaceAll('person_1', 'person_97').replaceAll('/scribes/1', '/scribes/97')
    );

    fireEvent.mouseOver(screen.getByRole('link', { name: 'William I' }));
    // The card appears immediately with what the page already knows.
    expect(await screen.findByRole('tooltip')).toBeTruthy();
    expect(screen.getAllByText('William I').length).toBeGreaterThan(1);
  });

  it('does not gloss a place — there is no Place authority to gloss from', async () => {
    const fetchMock = stubScribe({ id: 1 });
    renderProse(PLACE_LINK);

    fireEvent.mouseOver(screen.getByRole('link', { name: 'Melrose' }));

    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('dismisses the card when the pointer moves onto ordinary prose', async () => {
    // Closing hangs off `mouseover` on a non-anchor, not `mouseout`: mouseout
    // does not reliably reach the container, and depending on it left the card
    // stuck open — caught by this test.
    stubScribe({ id: 1, name: 'Barrow, Scribe Ab' });
    const { container } = renderProse(PERSON_LINK);

    fireEvent.mouseOver(screen.getByRole('link', { name: 'William I' }));
    expect(await screen.findByRole('tooltip')).toBeTruthy();

    fireEvent.mouseOver(container.querySelector('p') as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('dismisses the card when the pointer moves anywhere outside this prose', async () => {
    // The listener is on the document, not the container: a page carries one of
    // these per description plus one for the structured description, and a
    // container-scoped listener never fires when the pointer moves to a
    // different instance — so the card stayed open. Found in a real browser.
    stubScribe({ id: 1, name: 'Barrow, Scribe Ab' });
    renderProse(PERSON_LINK);

    fireEvent.mouseOver(screen.getByRole('link', { name: 'William I' }));
    expect(await screen.findByRole('tooltip')).toBeTruthy();

    fireEvent.mouseOver(document.body);
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('opens on keyboard focus, so the card is not mouse-only', async () => {
    stubScribe({ id: 1, name: 'Barrow, Scribe Ab' });
    renderProse(PERSON_LINK);

    fireEvent.focusIn(screen.getByRole('link', { name: 'William I' }));
    expect(await screen.findByRole('tooltip')).toBeTruthy();
  });

  it('attaches nothing to a legacy HTML row', async () => {
    const fetchMock = stubScribe({ id: 1 });
    renderProse(PERSON_LINK, false);

    fireEvent.mouseOver(screen.getByRole('link', { name: 'William I' }));

    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('leaves the prose class entirely to the caller', () => {
    // The msDesc section passes `.msdesc-preview`, the description passes
    // `.tei-linked-prose`; the component imposes neither.
    const { container } = renderProse(PERSON_LINK);
    expect(container.querySelector('.tei-linked-prose')).not.toBeNull();
  });
});
