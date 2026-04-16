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
  draftAllographId: number | null;
  draftHandId: number | null;
};

export type ViewerMode = 'public' | 'editor';
export type AnnotationCreationKind = 'public' | 'editorial';

export interface ViewerCapabilities {
  /**
   * Public annotation creation:
   * - public user: yes, but draft/demo only
   * - logged-in editor/admin: yes, and can persist
   */
  canCreatePublicAnnotations: boolean;
  canPersistPublicAnnotations: boolean;

  /**
   * Editorial annotation creation:
   * - public user: no
   * - logged-in editor/admin: yes, and can persist
   */
  canCreateEditorialAnnotations: boolean;
  canPersistEditorialAnnotations: boolean;

  /**
   * Existing persisted annotation operations.
   */
  canDeleteAnnotations: boolean;
  canModifyAnnotations: boolean;

  /**
   * Show editorial-only controls in shared UI.
   */
  canViewEditorialControls: boolean;

  /**
   * Settings button is available in both public and logged-in layers.
   */
  canUseSettings: boolean;

  /**
   * Logged-in/editor-only settings options.
   * The settings panel remains shared; its contents differ by capability.
   */
  canUseEditorSettings: boolean;
}

export type AnnotationEditorSource = 'persisted' | 'draft';
export type AnnotationEditorDirtyState = 'clean' | 'created' | 'updated' | 'deleted';

export interface AnnotationEditorRecord {
  id: string;
  annotation: A9sWithMeta;
  source: AnnotationEditorSource;
  dirtyState: AnnotationEditorDirtyState;
  isDeleted: boolean;
  lastTouchedAt: number;
}

export type AnnotationEditorRecordMap = Record<string, AnnotationEditorRecord>;

export type ViewerRole = 'public' | 'editor' | 'admin';

export interface ViewerAccessContext {
  isAuthenticated: boolean;
  role: ViewerRole;
  mode: ViewerMode;
  capabilities: ViewerCapabilities;
}

export interface AnnotationPopupCapabilities {
  canShare: boolean;
  canUseCollection: boolean;
  canEditDraft: boolean;
  canPersistDraft: boolean;
  canViewEditorMeta: boolean;
}

export interface AnnotationPopupMetaSummary {
  kindLabel: string;
  allographLabel?: string | null;
  handLabel?: string | null;
}
