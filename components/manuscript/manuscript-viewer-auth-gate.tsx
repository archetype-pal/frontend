'use client';

import * as React from 'react';

import { useTranslations } from 'next-intl';
import ManuscriptViewer from '@/components/manuscript/manuscript-viewer';
import { useAuth } from '@/contexts/auth-context';
import { resolveManuscriptViewerAccess } from '@/lib/manuscript-viewer-access';

interface ManuscriptViewerAuthGateProps {
  imageId: string;
}

export default function ManuscriptViewerAuthGate({
  imageId,
}: ManuscriptViewerAuthGateProps): React.JSX.Element {
  const t = useTranslations('common');
  const { token, user, isReady } = useAuth();

  if (!isReady) {
    return <div className="flex h-screen items-center justify-center">{t('loading')}</div>;
  }

  const viewerAccess = resolveManuscriptViewerAccess({
    isAuthenticated: Boolean(token && user),
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
