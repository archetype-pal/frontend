import type { ViewerCapabilities, ViewerMode } from '@/types/annotation-viewer';

export function getViewerCapabilities(mode: ViewerMode = 'public'): ViewerCapabilities {
  if (mode === 'editor') {
    return {
      canCreateAnnotations: true,
      canPersistAnnotations: true,
      canDeleteAnnotations: true,
      canModifyAnnotations: true,
      canViewEditorialControls: true,
      canUseSettings: true,
    };
  }

  return {
    canCreateAnnotations: true,
    canPersistAnnotations: false,
    canDeleteAnnotations: false,
    canModifyAnnotations: false,
    canViewEditorialControls: false,
    canUseSettings: true,
  };
}
