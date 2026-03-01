'use client';

import { BackofficeShell } from '@/components/backoffice/layout/backoffice-shell';
import { BackofficeErrorBoundary } from '@/components/backoffice/common/error-boundary';

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <BackofficeErrorBoundary>
      <BackofficeShell>{children}</BackofficeShell>
    </BackofficeErrorBoundary>
  );
}
