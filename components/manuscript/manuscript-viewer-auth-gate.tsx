'use client';

import * as React from 'react';

import ManuscriptViewer from '@/components/manuscript/manuscript-viewer';
import { ViewerLoadingState } from '@/components/manuscript/viewer-status-screen';
import { useAuth } from '@/contexts/auth-context';
import { getViewerCapabilities, getViewerMode } from '@/lib/viewer-capabilities';

interface ManuscriptViewerAuthGateProps {
  imageId: string;
}

export default function ManuscriptViewerAuthGate({
  imageId,
}: ManuscriptViewerAuthGateProps): React.JSX.Element {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return <ViewerLoadingState />;
  }

  return (
    <ManuscriptViewer
      imageId={imageId}
      mode={getViewerMode(user?.capabilities)}
      capabilities={getViewerCapabilities(user?.capabilities)}
    />
  );
}
