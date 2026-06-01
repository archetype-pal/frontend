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
    hasLocalChanges: false,
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

  it('renders editorial annotation notes in the shared tab layout', () => {
    renderCard({
      annotationKind: 'editorial',
      popupEditorMode: 'editorial_draft',
      popupTab: 'notes',
    });

    expect(screen.getByRole('tab', { name: 'Details' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Notes' }).getAttribute('data-state')).toBe('active');
    expect(screen.getByPlaceholderText('Type internal note')).not.toBeNull();
  });

  it('shows saved editorial components, features and positions when present', () => {
    renderCard({
      annotationKind: 'editorial',
      popupEditorMode: 'editorial_existing',
      isDraftAnnotation: false,
      popupTab: 'components',
      hasPositionsTab: true,
      selectedComponentGroups: [
        { componentId: 1, componentName: 'Stem', featureNames: ['Curved', 'Long'] },
      ],
      selectedPositionLabels: ['Initial'],
    });

    expect(screen.getByRole('tab', { name: 'Components' }).getAttribute('data-state')).toBe(
      'active'
    );
    expect(screen.getByRole('tab', { name: 'Positions' })).toBeTruthy();
    expect(screen.getByText('Stem')).toBeTruthy();
    expect(screen.getByText('Curved')).toBeTruthy();
    expect(screen.getByText('Long')).toBeTruthy();
  });

  it('includes saved editorial components and positions in the details overview', () => {
    renderCard({
      annotationKind: 'editorial',
      popupEditorMode: 'editorial_existing',
      isDraftAnnotation: false,
      hasPositionsTab: true,
      selectedComponentGroups: [
        { componentId: 1, componentName: 'Stem', featureNames: ['Curved'] },
      ],
      selectedPositionLabels: ['Initial'],
    });

    expect(screen.getByText('Components & features')).toBeTruthy();
    expect(screen.getByText('Stem')).toBeTruthy();
    expect(screen.getByText('Curved')).toBeTruthy();
    expect(screen.getAllByText('Positions').length).toBeGreaterThan(1);
    expect(screen.getByText('Initial')).toBeTruthy();
  });

  it('shows component and position details to public readers without separate tabs', () => {
    renderCard({
      popupEditorMode: 'public_existing',
      isDraftAnnotation: false,
      metaSummary: {
        kindLabel: 'Public',
        allographLabel: 'a, Caroline',
        handLabel: 'Hand A',
      },
      hasPositionsTab: true,
      selectedComponentGroups: [
        { componentId: 1, componentName: 'Stem', featureNames: ['Curved'] },
      ],
      selectedPositionLabels: ['Initial'],
    });

    expect(screen.getByRole('tab', { name: 'Details' }).getAttribute('data-state')).toBe('active');
    expect(screen.queryByRole('tab', { name: 'Components' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Positions' })).toBeNull();
    expect(screen.getByText('Annotation details')).toBeTruthy();
    expect(screen.getByText('a, Caroline')).toBeTruthy();
    expect(screen.getByText('Hand A')).toBeTruthy();
    expect(screen.getByText('Components & features')).toBeTruthy();
    expect(screen.getByText('Stem')).toBeTruthy();
    expect(screen.getByText('Curved')).toBeTruthy();
    expect(screen.getAllByText('Positions').length).toBeGreaterThan(1);
    expect(screen.getByText('Initial')).toBeTruthy();
  });

  it('shows live component and position details in the saved standard editor overview', () => {
    renderCard({
      popupEditorMode: 'standard_existing',
      isDraftAnnotation: false,
      allographOptions: [
        {
          id: 5,
          name: 'Caroline',
          character_name: 'a',
          components: [],
          positions: [{ id: 7, name: 'Initial' }],
        },
      ],
      draftAllographId: 5,
      draftGraphcomponentSet: [
        {
          component: 1,
          componentName: 'Stem',
          features: [2],
          featureDetails: [{ id: 2, name: 'Curved' }],
        },
      ],
      draftPositionIds: [7],
    });

    expect(screen.getByText('Components & features')).toBeTruthy();
    expect(screen.getByText('Stem')).toBeTruthy();
    expect(screen.getByText('Curved')).toBeTruthy();
    expect(screen.getAllByText('Positions').length).toBeGreaterThan(1);
    expect(screen.getByText('Initial')).toBeTruthy();
  });

  it('uses compact fixed sizing for lighter popup modes without a resize grip', () => {
    renderCard();

    const dialog = screen.getByRole('dialog');
    expect(dialog.style.width).toBe('min(420px, calc(100vw - 2rem))');
    expect(dialog.style.height).toBe('min(440px, calc(100vh - 2rem))');
    expect(screen.queryByRole('slider', { name: /resize panel/i })).toBeNull();
  });

  it('uses a slightly taller fixed height for public annotation details', () => {
    renderCard({
      popupEditorMode: 'public_existing',
      isDraftAnnotation: false,
    });

    expect(screen.getByRole('dialog').style.height).toBe('min(480px, calc(100vh - 2rem))');
  });

  it('keeps the expanded fixed height for saved standard editors', () => {
    renderCard({
      popupEditorMode: 'standard_existing',
      isDraftAnnotation: false,
    });

    expect(screen.getByRole('dialog').style.height).toBe('min(560px, calc(100vh - 2rem))');
  });

  it('explains both save paths and disables OK for an unchanged existing annotation', () => {
    renderCard({
      isDraftAnnotation: false,
      popupEditorMode: 'standard_existing',
    });

    expect(
      screen.getByText(/Press OK to keep changes local for the main toolbar Save/)
    ).toBeTruthy();
    expect(screen.getByText(/Save Annotation \(s\) in this popup header/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'OK' }).hasAttribute('disabled')).toBe(true);
  });

  it('enables OK when an existing annotation has local popup changes', () => {
    renderCard({
      isDraftAnnotation: false,
      popupEditorMode: 'editorial_existing',
      annotationKind: 'editorial',
      hasLocalChanges: true,
    });

    expect(screen.getByRole('button', { name: 'OK' }).hasAttribute('disabled')).toBe(false);
  });

  it('passes the popup save disabled state through to the header action', () => {
    renderCard({
      canSaveAnnotationShortcut: true,
      isSaveAnnotationShortcutDisabled: true,
      onSaveAnnotationShortcut: vi.fn(),
    });

    const saveAnnotation = screen.getByRole('button', { name: 'Save Annotation' });
    expect(saveAnnotation.hasAttribute('disabled')).toBe(true);
    expect(saveAnnotation.getAttribute('aria-keyshortcuts')).toBe('S');
  });
});
