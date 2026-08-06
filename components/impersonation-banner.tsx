'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { VenetianMask } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * Persistent, app-wide banner shown while a superuser is browsing as another
 * user (see `useAuth().isImpersonating`). Mounted in the root layout, inside
 * `AuthProvider`, so it's visible on every route — impersonation targets are
 * always regular (non-staff) accounts, so the natural post-impersonation
 * landing place is the public site, not the backoffice.
 */
export function ImpersonationBanner() {
  const { isImpersonating, user, stopImpersonation } = useAuth();
  const router = useRouter();
  const t = useTranslations('impersonation');

  if (!isImpersonating) return null;

  function handleStop() {
    stopImpersonation();
    router.push('/');
    router.refresh();
  }

  return (
    <Alert
      variant="default"
      className="fixed inset-x-0 top-0 z-[100] rounded-none border-x-0 border-t-0 border-amber-600 bg-amber-400 px-4 py-2.5 text-amber-950 shadow-md dark:border-amber-500 dark:bg-amber-600 dark:text-amber-50"
    >
      <div className="mx-auto flex max-w-screen-lg flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
        <VenetianMask className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">
          {t('bannerMessage', { username: user?.username ?? '' })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 border-amber-950/30 bg-transparent text-amber-950 hover:bg-amber-950/10 dark:border-amber-50/30 dark:text-amber-50 dark:hover:bg-amber-50/10"
          onClick={handleStop}
        >
          {t('stopButton')}
        </Button>
      </div>
    </Alert>
  );
}
