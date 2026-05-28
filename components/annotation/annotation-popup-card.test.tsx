import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import { AnnotationPopupCard } from './annotation-popup-card';
import { ModelLabelsProvider } from '@/contexts/model-labels-context';
import { getDefaultModelLabelsConfig } from '@/lib/model-labels';

type AnnotationPopupCardProps = React.ComponentProps<typeof AnnotationPopupCard>;

function renderCard(overrides: Partial<AnnotationPopupCardProps> = {}) {
  const props: AnnotationPopupCardProps = {
    title: 'Annotation',
    isDraftAnnotation: true,
    annotationKind: 'public',
    popupCapabilities: {
      canShare: true,
      canUseCollection: false,
      canEditDraft: true,
      canPersistDraft: true,
      canViewEditorMeta: true,
    },
    popupTransform: 'translate3d(0, 0, 0)',
    isShareUrlVisible: false,
    shareUrl: '',
    onCopyShareUrl: vi.fn(),
    onHideShareUrl: vi.fn(),
    onShareSelectedAnnotation: vi.fn(),
    onCloseSelectedAnnotation: vi.fn(),
    draftAllographText: '',
    onDraftAllographTextChange: vi.fn(),
    draftNoteText: '',
    onDraftNoteTextChange: vi.fn(),
    popupEditorMode: 'standard_draft',
    allographOptions: [],
    handOptions: [],
    draftAllographId: null,
    draftHandId: null,
    onDraftAllographIdChange: vi.fn(),
    onDraftHandIdChange: vi.fn(),
    draftGraphcomponentSet: [],
    onDraftGraphcomponentSetChange: vi.fn(),
    draftPositionIds: [],
    onDraftPositionIdsChange: vi.fn(),
    draftInternalNoteText: '',
    onDraftInternalNoteTextChange: vi.fn(),
    onCancelDraftAnnotation: vi.fn(),
    onConfirmDraftAnnotation: vi.fn(),
    popupTab: 'details',
    onPopupTabChange: vi.fn(),
    hasPositionsTab: false,
    selectedComponentGroups: [],
    selectedPositionLabels: [],
    selectedNotes: [],
    ...overrides,
  };

  render(
    <ModelLabelsProvider initialConfig={getDefaultModelLabelsConfig()}>
      <AnnotationPopupCard {...props} />
    </ModelLabelsProvider>
  );

  return props;
}

describe('AnnotationPopupCard', () => {
  it('moves standard annotation notes into a separate tab', () => {
    const props = renderCard();

    expect(screen.getByRole('tab', { name: 'Details' }).getAttribute('data-state')).toBe('active');
    expect(screen.getByRole('tab', { name: 'Components' }).getAttribute('data-state')).toBe(
      'inactive'
    );
    expect(screen.getByRole('tab', { name: 'Positions' }).getAttribute('data-state')).toBe(
      'inactive'
    );
    expect(screen.getByRole('tab', { name: 'Notes' }).getAttribute('data-state')).toBe('inactive');
    expect(screen.queryByPlaceholderText('Type note')).toBeNull();

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Notes' }), {
      button: 0,
      ctrlKey: false,
    });
    expect(props.onPopupTabChange).toHaveBeenCalledWith('notes');
  });

  it('renders standard components in their own tab', () => {
    renderCard({ popupTab: 'components' });

    expect(screen.getByRole('tab', { name: 'Components' }).getAttribute('data-state')).toBe(
      'active'
    );
    expect(screen.getAllByText('Components').length).toBeGreaterThan(1);
    expect(
      screen.getByText('Choose an allograph to load the related components and features.')
    ).not.toBeNull();
  });

  it('renders standard positions in their own tab', () => {
    renderCard({ popupTab: 'positions' });

    expect(screen.getByRole('tab', { name: 'Positions' }).getAttribute('data-state')).toBe(
      'active'
    );
    expect(screen.getAllByText('Positions').length).toBeGreaterThan(1);
    expect(screen.getByText('None selected')).not.toBeNull();
  });

  it('renders the standard note editor when the notes tab is selected', () => {
    renderCard({ popupTab: 'notes' });

    expect(screen.getByRole('tab', { name: 'Notes' }).getAttribute('data-state')).toBe('active');
    expect(screen.getByPlaceholderText('Type note')).not.toBeNull();
  });

  it('keeps editorial popups out of the standard tab layout', () => {
    renderCard({
      annotationKind: 'editorial',
      popupEditorMode: 'editorial_draft',
    });

    expect(screen.queryByRole('tab', { name: 'Details' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Notes' })).toBeNull();
    expect(screen.getByPlaceholderText('Type internal note')).not.toBeNull();
  });
});
