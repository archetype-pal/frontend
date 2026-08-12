'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  Loader2,
  RefreshCcw,
  Send,
  XCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { formatBytes } from '@/lib/format-bytes';
import { BackofficeApiError } from '@/services/backoffice/api-client';
import {
  getSanityChecks,
  sendTestEmail,
  type ServiceCheck,
} from '@/services/backoffice/sanity-checks';

/** Best-effort human message from a failed sendTestEmail call. */
function extractErrorDetail(err: unknown): string | undefined {
  if (err instanceof BackofficeApiError) {
    const body = err.body;
    if (typeof body.detail === 'string') return body.detail;
  }
  if (err instanceof Error) return err.message;
  return undefined;
}

function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-severity-success" aria-hidden />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-severity-overdue" aria-hidden />
        )}
        <span className="text-sm">{label}</span>
      </div>
      {!ok && detail && (
        <span className="max-w-[60%] text-right text-xs text-muted-foreground">{detail}</span>
      )}
    </div>
  );
}

export function SanityChecksDashboard() {
  const t = useTranslations('backoffice');
  const { token } = useAuth();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['backoffice', 'sanity-checks'],
    queryFn: () => getSanityChecks(token!),
    enabled: !!token,
    staleTime: 30_000,
  });

  const testEmailMutation = useMutation({
    mutationFn: () => sendTestEmail(token!),
    onSuccess: (result) => {
      toast.success(t('sanityChecks.smtp.toastSuccess'), { description: result.detail });
    },
    onError: (err) => {
      toast.error(t('sanityChecks.smtp.toastError'), { description: extractErrorDetail(err) });
    },
  });

  function handleSendTestEmail() {
    if (!token || testEmailMutation.isPending) return;
    testEmailMutation.mutate();
  }

  const services: Array<{ key: string; label: string; check: ServiceCheck }> = data
    ? [
        {
          key: 'database',
          label: t('sanityChecks.services.database'),
          check: data.services.database,
        },
        { key: 'redis', label: t('sanityChecks.services.redis'), check: data.services.redis },
        {
          key: 'meilisearch',
          label: t('sanityChecks.services.meilisearch'),
          check: data.services.meilisearch,
        },
        {
          key: 'celery_broker',
          label: t('sanityChecks.services.celeryBroker'),
          check: data.services.celery_broker,
        },
      ]
    : [];

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HeartPulse className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('sanityChecks.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('sanityChecks.subtitle')}</p>
          </div>
        </div>
        <Button onClick={() => void refetch()} variant="outline" size="sm" disabled={isFetching}>
          {isFetching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="mr-2 h-4 w-4" />
          )}
          {t('sanityChecks.refresh')}
        </Button>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('sanityChecks.error', { message: (error as Error).message })}</AlertTitle>
        </Alert>
      )}

      {isLoading && !data && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{t('sanityChecks.migrations.title')}</span>
                {data.migrations.has_pending ? (
                  <Badge variant="destructive">
                    {data.migrations.pending.length} {t('sanityChecks.migrations.pendingLabel')}
                  </Badge>
                ) : (
                  <Badge variant="secondary">{t('sanityChecks.migrations.upToDate')}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            {data.migrations.has_pending && (
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {data.migrations.pending.map((migration) => (
                    <li key={migration} className="font-mono text-xs">
                      {migration}
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('sanityChecks.services.title')}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {services.map(({ key, label, check }) => (
                <StatusRow key={key} ok={check.ok} label={label} detail={check.detail} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('sanityChecks.storage.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>{t('sanityChecks.storage.databaseSize')}</span>
                <span className="font-mono text-xs">
                  {data.database_size_bytes === null
                    ? t('sanityChecks.storage.unavailable')
                    : formatBytes(data.database_size_bytes)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>{t('sanityChecks.storage.mediaSize')}</span>
                <span className="font-mono text-xs">{formatBytes(data.media.size_bytes)}</span>
              </div>
              <p className="truncate text-xs text-muted-foreground" title={data.media.path}>
                {t('sanityChecks.storage.path', { path: data.media.path })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('sanityChecks.permissions.title')}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <StatusRow
                ok={data.media.writable}
                label={t('sanityChecks.permissions.mediaWritable')}
                detail={null}
              />
              <StatusRow
                ok={data.logs.writable}
                label={t('sanityChecks.permissions.logsWritable')}
                detail={null}
              />
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{t('sanityChecks.smtp.title')}</span>
                {data.email.smtp_configured ? (
                  <Badge variant="secondary">{t('sanityChecks.smtp.configured')}</Badge>
                ) : (
                  <Badge variant="destructive">{t('sanityChecks.smtp.notConfigured')}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.email.smtp_configured ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {t('sanityChecks.smtp.description')}
                  </p>
                  <Button onClick={handleSendTestEmail} disabled={testEmailMutation.isPending}>
                    {testEmailMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {testEmailMutation.isPending
                      ? t('sanityChecks.smtp.sending')
                      : t('sanityChecks.smtp.send')}
                  </Button>
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t('sanityChecks.smtp.cannotSendTitle')}</AlertTitle>
                  <AlertDescription>
                    {t('sanityChecks.smtp.notConfiguredDescription')}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
