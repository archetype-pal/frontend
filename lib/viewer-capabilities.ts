import type {
  AnnotationCreationKind,
  ViewerCapabilities,
  ViewerMode,
} from '@/types/annotation-viewer';

export function getViewerCapabilities(mode: ViewerMode = 'public'): ViewerCapabilities {
  if (mode === 'editor') {
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
    };
  }

  return {
    canCreatePublicAnnotations: true,
    canPersistPublicAnnotations: false,
    canCreateEditorialAnnotations: false,
    canPersistEditorialAnnotations: false,
    canDeleteAnnotations: false,
    canModifyAnnotations: false,
    canViewEditorialControls: false,
    canUseSettings: true,
    canUseEditorSettings: false,
  };
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
