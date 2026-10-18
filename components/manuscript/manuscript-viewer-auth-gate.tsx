'use client';

import * as React from 'react';

import ManuscriptViewer from '@/components/manuscript/manuscript-viewer';
import { ViewerLoadingState } from '@/components/manuscript/viewer-status-screen';
import { useAuth } from '@/contexts/auth-context';
import { resolveManuscriptViewerAccess } from '@/lib/manuscript-viewer-access';

interface ManuscriptViewerAuthGateProps {
  imageId: string;
}

export default function ManuscriptViewerAuthGate({
  imageId,
}: ManuscriptViewerAuthGateProps): React.JSX.Element {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return <ViewerLoadingState />;
  }

  const viewerAccess = resolveManuscriptViewerAccess({
    isAuthenticated,
    isEditor: false,
    isAdmin: false,
  });

  return (
    <ManuscriptViewer
      imageId={imageId}
      mode={viewerAccess.mode}
      capabilities={viewerAccess.capabilities}
    />
  );
}
