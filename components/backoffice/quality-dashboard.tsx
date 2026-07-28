'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { fetchQualityDashboard } from '@/services/backoffice/quality-dashboard';

export function QualityDashboard() {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ['backoffice', 'quality-dashboard'],
    queryFn: () => fetchQualityDashboard(token!),
    enabled: !!token,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('quality.title')}</h1>
          {data && (
            <p className="text-xs text-muted-foreground">
              {t('quality.generatedAt', {
                timestamp: new Date(data.generated_at).toLocaleString(),
              })}
            </p>
          )}
        </div>
        <Button onClick={() => void refetch()} variant="outline" size="sm">
          {isFetching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="mr-2 h-4 w-4" />
          )}
          {t('quality.refresh')}
        </Button>
      </header>

      {error && (
        <p className="text-sm text-destructive">
          {t('quality.error', { message: (error as Error).message })}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.cards.map((card) => (
          <Card key={card.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{card.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    card.count === 0
                      ? 'bg-severity-success/15 text-[hsl(var(--c-severity-success-h)_var(--c-severity-success-s)_28%)] dark:text-[hsl(var(--c-severity-success-h)_var(--c-severity-success-s)_75%)]'
                      : 'bg-severity-warning/15 text-[hsl(var(--c-severity-warning-h)_var(--c-severity-warning-s)_28%)] dark:text-[hsl(var(--c-severity-warning-h)_var(--c-severity-warning-s)_75%)]'
                  }`}
                >
                  {card.count}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {card.sample.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('quality.allClean')}</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {card.sample.map((row, i) => (
                    <li key={i} className="font-mono text-xs">
                      {JSON.stringify(row)}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
