import type {
  AnnotationCreationKind,
  ViewerCapabilities,
  ViewerMode,
} from '@/types/annotation-viewer';
import type { UserCapabilities } from '@/types';

/**
 * What the viewer offers, from what the API says the user may do. Anyone may sketch a draft;
 * saving, editing and deleting need `annotate`, and the editorial kind needs
 * `annotate_editorially`, the same rules the write endpoints enforce.
 */
export function getViewerCapabilities(user?: UserCapabilities | null): ViewerCapabilities {
  const annotate = Boolean(user?.annotate);
  const editorial = Boolean(user?.annotate_editorially);
  return {
    canCreatePublicAnnotations: true,
    canPersistPublicAnnotations: annotate,
    canCreateEditorialAnnotations: editorial,
    canPersistEditorialAnnotations: editorial,
    canDeleteAnnotations: annotate,
    canModifyAnnotations: annotate,
    canViewEditorialControls: annotate,
    canUseSettings: true,
    canUseEditorSettings: annotate,
    canEditTexts: Boolean(user?.manage),
  };
}

/** The viewer's mode follows whether the user may annotate. */
export function getViewerMode(user?: UserCapabilities | null): ViewerMode {
  return user?.annotate ? 'editor' : 'public';
}

export function canCreateAnnotationKind(
  capabilities: ViewerCapabilities,
  kind: AnnotationCreationKind
): boolean {
  return kind === 'editorial'
    ? capabilities.canCreateEditorialAnnotations
    : capabilities.canCreatePublicAnnotations;
}

export function canPersistAnnotationKind(
  capabilities: ViewerCapabilities,
  kind: AnnotationCreationKind
): boolean {
  return kind === 'editorial'
    ? capabilities.canPersistEditorialAnnotations
    : capabilities.canPersistPublicAnnotations;
}

export function getDefaultAnnotationCreationKind(
  capabilities: ViewerCapabilities
): AnnotationCreationKind | null {
  if (capabilities.canCreatePublicAnnotations) return 'public';
  if (capabilities.canCreateEditorialAnnotations) return 'editorial';
  return null;
}
