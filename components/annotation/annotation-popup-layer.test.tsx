import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AnnotationPopupLayer } from './annotation-popup-layer';
import type { CollectionItem } from '@/contexts/collection-context';
import type { PopupRecord, ViewerCapabilities } from '@/types/annotation-viewer';
import type { Allograph } from '@/types/allographs';
import type { HandType } from '@/types/hands';

// Mock the popup card to inspect what it receives. The real card is huge
// and exercises radix/select internals — for the *layer* we only care
// that it threads props through correctly per popup.
vi.mock('./annotation-popup-card', () => ({
  AnnotationPopupCard: (props: Record<string, unknown>) => (
    <div
      data-testid="popup-card"
      data-popup-title={String(props.title)}
      data-active={String(props.isActive)}
      data-z-index={String(props.zIndex)}
      data-in-collection={String(props.isAnnotationInCollection)}
      data-can-use-collection={String(
        (props.popupCapabilities as { canUseCollection?: boolean }).canUseCollection
      )}
    >
      {/* Buttons exposing the wiring we want to test. */}
      <button
        data-testid="set-allograph-text"
        onClick={() => (props.onDraftAllographTextChange as (v: string) => void)('typed-text')}
      />
      <button
        data-testid="set-note-text"
        onClick={() => (props.onDraftNoteTextChange as (v: string) => void)('note-text')}
      />
      <button
        data-testid="set-positions"
        onClick={() => (props.onDraftPositionIdsChange as (v: number[]) => void)([1, 2])}
      />
      <button
        data-testid="set-allograph-id"
        onClick={() => (props.onDraftAllographIdChange as (v: number | null) => void)(7)}
      />
      <button
        data-testid="set-hand-id"
        onClick={() => (props.onDraftHandIdChange as (v: number | null) => void)(11)}
      />
      <button
        data-testid="confirm-draft"
        onClick={() => void (props.onConfirmDraftAnnotation as () => void)()}
      />
      <button
        data-testid="cancel-draft"
        onClick={() => (props.onCancelDraftAnnotation as () => void)()}
      />
      <button data-testid="copy-share-url" onClick={() => (props.onCopyShareUrl as () => void)()} />
      <button
        data-testid="toggle-collection"
        onClick={() => (props.onToggleAnnotationCollection as (() => void) | undefined)?.()}
      />
    </div>
  ),
}));

// DraggablePopupLayer wires an effect against useDraggablePosition; stub it
// to just invoke the children render-prop synchronously.
vi.mock('@/components/manuscript/draggable-popup-layer', () => ({
  DraggablePopupLayer: ({
    children,
    zIndex,
  }: {
    zIndex: number;
    children: (props: {
      popupTransform: string;
      dragHandleProps: object;
      zIndex: number;
      onPointerDownCapture: () => void;
    }) => React.ReactNode;
  }) => (
    <div data-testid="drag-layer">
      {children({
        popupTransform: 'translate3d(0,0,0)',
        dragHandleProps: {},
        zIndex,
        onPointerDownCapture: () => {},
      })}
    </div>
  ),
}));

function makePopup(id: string, overrides: Partial<PopupRecord> = {}): PopupRecord {
  return {
    id,
    annotation: {
      id,
      type: 'Annotation',
      target: {},
      _meta: {},
    },
    popupTab: 'components',
    shareUrl: '',
    isShareUrlVisible: false,
    draftAllographText: '',
    draftNoteText: '',
    draftAllographId: null,
    draftHandId: null,
    draftInternalNoteText: '',
    draftGraphcomponentSet: [],
    draftPositionIds: [],
    ...overrides,
  } as PopupRecord;
}

function makeCaps(): ViewerCapabilities {
  return {
    canCreatePublicAnnotations: true,
    canPersistPublicAnnotations: true,
    canCreateEditorialAnnotations: true,
    canPersistEditorialAnnotations: true,
    canDeleteAnnotations: true,
    canModifyAnnotations: true,
    canViewEditorialControls: true,
    canUseSettings: true,
    canUseEditorSettings: true,
  } as ViewerCapabilities;
}

function defaults() {
  return {
    visiblePopupRecords: [makePopup('local-a')] as PopupRecord[],
    activePopupId: 'local-a' as string | null,
    viewerCapabilities: makeCaps(),
    allographs: [] as Allograph[],
    allographNameById: new Map<number, string>(),
    allographLabelById: new Map<number, string>(),
    handsForThisImage: [] as HandType[],
    handNameById: new Map<number, string>(),
    allowMultipleBoxes: false,
    singlePopupPosition: { x: 0, y: 0 },
    getCollectionItemFor: vi.fn(() => null),
    isInCollection: vi.fn(() => false),
    getCanonicalAnnotation: vi.fn((a: PopupRecord['annotation']) => a),
    onActivatePopup: vi.fn(),
    onPopupPositionChange: vi.fn(),
    updatePopupById: vi.fn(),
    onDraftAllographIdChange: vi.fn(),
    onDraftHandIdChange: vi.fn(),
    onPopupTabChange: vi.fn(),
    onCopyShareUrl: vi.fn(),
    onHideShareUrl: vi.fn(),
    onShareSelectedAnnotation: vi.fn(),
    onCloseSelectedAnnotation: vi.fn(),
    onToggleAnnotationCollection: vi.fn(),
    onCancelDraftAnnotation: vi.fn(),
    onConfirmDraftAnnotation: vi.fn(),
  };
}

describe('AnnotationPopupLayer', () => {
  it('renders nothing when visiblePopupRecords is empty', () => {
    const { container } = render(<AnnotationPopupLayer {...defaults()} visiblePopupRecords={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one card per popup record', () => {
    render(
      <AnnotationPopupLayer
        {...defaults()}
        visiblePopupRecords={[makePopup('a'), makePopup('b'), makePopup('c')]}
      />
    );
    expect(screen.getAllByTestId('popup-card')).toHaveLength(3);
  });

  it('marks the active popup with the elevated z-index', () => {
    render(
      <AnnotationPopupLayer
        {...defaults()}
        visiblePopupRecords={[makePopup('a'), makePopup('b')]}
        activePopupId="b"
      />
    );
    const cards = screen.getAllByTestId('popup-card');
    // First card is 'a' (inactive); second is 'b' (active).
    expect(cards[0].dataset.active).toBe('false');
    expect(cards[1].dataset.active).toBe('true');
    // Active z-index (80) is larger than the inactive base (60).
    expect(Number(cards[1].dataset.zIndex)).toBeGreaterThan(Number(cards[0].dataset.zIndex));
  });

  it('updatePopupById receives correct field updates for the trivial draft handlers', () => {
    const props = defaults();
    render(<AnnotationPopupLayer {...props} />);

    fireEvent.click(screen.getByTestId('set-allograph-text'));
    expect(props.updatePopupById).toHaveBeenCalledWith('local-a', {
      draftAllographText: 'typed-text',
    });

    fireEvent.click(screen.getByTestId('set-note-text'));
    expect(props.updatePopupById).toHaveBeenCalledWith('local-a', { draftNoteText: 'note-text' });

    fireEvent.click(screen.getByTestId('set-positions'));
    expect(props.updatePopupById).toHaveBeenCalledWith('local-a', { draftPositionIds: [1, 2] });
  });

  it('forwards allograph / hand id changes to the dedicated handlers (not updatePopupById)', () => {
    // Allograph id change cascades (clears related fields) — it must go
    // through the dedicated handler, not the generic updatePopupById path.
    const props = defaults();
    render(<AnnotationPopupLayer {...props} />);

    fireEvent.click(screen.getByTestId('set-allograph-id'));
    expect(props.onDraftAllographIdChange).toHaveBeenCalledWith('local-a', 7);
    expect(props.updatePopupById).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('set-hand-id'));
    expect(props.onDraftHandIdChange).toHaveBeenCalledWith('local-a', 11);
  });

  it('per-popup action callbacks fire with the correct popupId', () => {
    const props = defaults();
    render(
      <AnnotationPopupLayer
        {...props}
        visiblePopupRecords={[makePopup('a'), makePopup('b')]}
        activePopupId="b"
      />
    );
    // Click confirm-draft on the SECOND card (popup b).
    const cards = screen.getAllByTestId('popup-card');
    fireEvent.click(cards[1].querySelector('[data-testid="confirm-draft"]')!);
    expect(props.onConfirmDraftAnnotation).toHaveBeenCalledWith('b');

    fireEvent.click(cards[0].querySelector('[data-testid="cancel-draft"]')!);
    expect(props.onCancelDraftAnnotation).toHaveBeenCalledWith('a');

    fireEvent.click(cards[0].querySelector('[data-testid="copy-share-url"]')!);
    expect(props.onCopyShareUrl).toHaveBeenCalledWith('a');
  });

  it('toggle-collection callback only fires when getCollectionItemFor returns an item', () => {
    const fakeItem = { id: 42, type: 'graph' } as CollectionItem;
    const props = {
      ...defaults(),
      getCollectionItemFor: vi.fn(() => fakeItem),
      isInCollection: vi.fn(() => true),
    };
    render(<AnnotationPopupLayer {...props} />);

    fireEvent.click(screen.getByTestId('toggle-collection'));
    expect(props.onToggleAnnotationCollection).toHaveBeenCalledTimes(1);
    // The card sees the in-collection flag derived from isInCollection.
    expect(screen.getByTestId('popup-card').dataset.inCollection).toBe('true');
  });

  it('wires saved editorial annotations to collection controls', () => {
    const editorialItem = {
      id: 99,
      type: 'graph',
      annotation_type: 'editorial',
    } as CollectionItem;
    const props = {
      ...defaults(),
      visiblePopupRecords: [
        makePopup('db:99', {
          annotation: {
            id: 'db:99',
            type: 'Annotation',
            target: {},
            _meta: { annotationType: 'editorial' },
          },
        }),
      ],
      activePopupId: 'db:99',
      getCollectionItemFor: vi.fn(() => editorialItem),
      isInCollection: vi.fn(() => false),
    };
    render(<AnnotationPopupLayer {...props} />);

    expect(screen.getByTestId('popup-card').dataset.canUseCollection).toBe('true');
    fireEvent.click(screen.getByTestId('toggle-collection'));
    expect(props.onToggleAnnotationCollection).toHaveBeenCalledTimes(1);
  });

  it('toggle-collection is a no-op when the annotation has no collection item', () => {
    const props = defaults(); // getCollectionItemFor returns null
    render(<AnnotationPopupLayer {...props} />);

    fireEvent.click(screen.getByTestId('toggle-collection'));
    expect(props.onToggleAnnotationCollection).not.toHaveBeenCalled();
  });

  it('uses getCanonicalAnnotation when asking the caller for a collection item', () => {
    const canonical = {
      id: 'db:99',
      type: 'Annotation',
      target: {},
      _meta: { allographId: 5 },
    } as PopupRecord['annotation'];
    const props = {
      ...defaults(),
      visiblePopupRecords: [makePopup('local-a')],
      getCanonicalAnnotation: vi.fn(() => canonical),
      getCollectionItemFor: vi.fn(() => null),
    };
    render(<AnnotationPopupLayer {...props} />);

    expect(props.getCanonicalAnnotation).toHaveBeenCalled();
    // Whatever getCanonicalAnnotation returned is what gets passed to
    // getCollectionItemFor (not the popup's raw annotation).
    expect(props.getCollectionItemFor).toHaveBeenCalledWith(canonical);
  });
});
