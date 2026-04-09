import type { Annotation as A9sAnnotation } from '@/components/manuscript/ManuscriptAnnotorious';

export type A9sFeatureDetail = {
  id: number;
  name: string;
};

export type A9sGraphComponent = {
  component: number;
  componentName?: string;
  features: number[];
  featureDetails?: A9sFeatureDetail[];
};

export type A9sPositionDetail = {
  id: number;
  name: string;
};

export type A9sWithMeta = A9sAnnotation & {
  body?: Array<{ value?: string; type?: string; purpose?: string }>;
  _meta?: {
    allographId?: number;
    handId?: number;
    numFeatures?: number;
    isDescribed?: boolean;
    annotationType?: string;
    graphcomponentSet?: A9sGraphComponent[];
    positionDetails?: A9sPositionDetail[];
  };
};

export type DraftSharePayload = {
  id: string;
  target: A9sAnnotation['target'];
  body?: A9sAnnotation['body'];
  _meta?: A9sWithMeta['_meta'];
};

export type AnnotationVisibilityFilters = {
  allographIds: number[];
  handIds: number[];
  showEditorial: boolean;
  showPublicAnnotations: boolean;
};

export type ToolbarPosition = 'vertical' | 'horizontal';

export type AnnotationViewerSettings = {
  allowMultipleBoxes: boolean;
  selectMultipleAnnotations: boolean;
  toolbarPosition: ToolbarPosition;
};

export type PopupRecord = {
  id: string;
  annotation: A9sWithMeta;
  popupTab: 'components' | 'positions' | 'notes';
  shareUrl: string;
  isShareUrlVisible: boolean;
  draftAllographText: string;
  draftNoteText: string;
};

export type ViewerMode = 'public' | 'editor';

export interface ViewerCapabilities {
  /**
   * Public mode already allows temporary/demo annotation creation,
   * so this is true for both public and editor layers.
   */
  canCreateAnnotations: boolean;

  /**
   * Persist changes to the backend.
   * Public mode: false
   * Editor/admin mode: true
   */
  canPersistAnnotations: boolean;

  /**
   * Delete existing persisted annotations.
   * Public mode: false
   * Editor/admin mode: true
   */
  canDeleteAnnotations: boolean;

  /**
   * Modify existing persisted annotation geometry/content.
   * Public mode: false
   * Editor/admin mode: true
   */
  canModifyAnnotations: boolean;

  /**
   * Show editorial-only controls/filters/settings.
   * Public mode: false
   * Editor/admin mode: true
   */
  canViewEditorialControls: boolean;

  /**
   * Show/open viewer settings.
   * Public mode currently already has this, so true for both.
   */
  canUseSettings: boolean;
}
