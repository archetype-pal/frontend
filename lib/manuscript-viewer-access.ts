import { getViewerCapabilities } from '@/lib/viewer-capabilities';

import type {
  ViewerAccessContext,
  ViewerCapabilities,
  ViewerMode,
  ViewerRole,
} from '@/types/annotation-viewer';

export interface ResolveViewerAccessInput {
  isAuthenticated?: boolean;
  isEditor?: boolean;
  isAdmin?: boolean;
}

export function resolveViewerRole(input: ResolveViewerAccessInput = {}): ViewerRole {
  if (input.isAdmin) return 'admin';
  if (input.isEditor) return 'editor';
  if (input.isAuthenticated) return 'editor';
  return 'public';
}

export function getViewerModeForRole(role: ViewerRole): ViewerMode {
  return role === 'public' ? 'public' : 'editor';
}

export function getViewerCapabilitiesForRole(role: ViewerRole): ViewerCapabilities {
  switch (role) {
    case 'admin':
    case 'editor':
      return getViewerCapabilities('editor');
    case 'public':
    default:
      return getViewerCapabilities('public');
  }
}

export function resolveManuscriptViewerAccess(
  input: ResolveViewerAccessInput = {}
): ViewerAccessContext {
  const role = resolveViewerRole(input);
  const mode = getViewerModeForRole(role);
  const capabilities = getViewerCapabilitiesForRole(role);

  return {
    isAuthenticated: role !== 'public',
    role,
    mode,
    capabilities,
  };
}
