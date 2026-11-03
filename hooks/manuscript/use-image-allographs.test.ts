/** @vitest-environment jsdom */
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Annotation as A9sAnnotation } from '@/components/manuscript/manuscript-annotorious';
import type { Allograph } from '@/types/allographs';

import { useImageAllographs } from './use-image-allographs';

const allograph = (id: number) => ({ id, name: `a${id}` }) as Allograph;
const A = allograph(1);
const B = allograph(2);

const annotation = (id: string, annotationType: string, allographId: number) =>
  ({ id, _meta: { annotationType, allographId } }) as unknown as A9sAnnotation;

function setup({
  annotations,
  loaded = true,
  filteredAllograph,
}: {
  annotations: A9sAnnotation[];
  loaded?: boolean;
  filteredAllograph?: Allograph;
}) {
  const setFilteredAllograph = vi.fn();
  const setHoveredAllograph = vi.fn();
  const { result } = renderHook(() =>
    useImageAllographs({
      allographs: [A, B],
      annotations,
      loaded,
      filteredAllograph,
      setFilteredAllograph,
      setHoveredAllograph,
    })
  );
  return { result: result.current, setFilteredAllograph, setHoveredAllograph };
}

describe('useImageAllographs', () => {
  it('offers every allograph to the side panel and none to the header until loaded', () => {
    const { result } = setup({ annotations: [annotation('db:1', 'image', A.id)], loaded: false });

    expect(result.allographsForThisImage).toEqual([A, B]);
    expect(result.headerAllographsForThisImage).toEqual([]);
  });

  it('scopes both lists to the allographs on saved image graphs', () => {
    const { result } = setup({
      annotations: [
        annotation('db:1', 'image', A.id),
        annotation('db:2', 'text', B.id),
        annotation('db:3', 'editorial', B.id),
        annotation('draft-1', 'public', B.id),
      ],
    });

    expect(result.allographsForThisImage).toEqual([A]);
    expect(result.headerAllographsForThisImage).toEqual([A]);
    expect(result.availableAllographFilterIds).toEqual([A.id]);
  });

  it('clears a filtered allograph the image does not carry', () => {
    const cleared = setup({
      annotations: [annotation('db:1', 'image', A.id)],
      filteredAllograph: B,
    });
    expect(cleared.setFilteredAllograph).toHaveBeenCalledWith(undefined);
    expect(cleared.setHoveredAllograph).toHaveBeenCalledWith(undefined);

    const kept = setup({ annotations: [annotation('db:1', 'image', A.id)], filteredAllograph: A });
    expect(kept.setFilteredAllograph).not.toHaveBeenCalled();
  });
});
