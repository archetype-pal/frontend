'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  Activity,
  ArrowUpRight,
  BookOpenText,
  ExternalLink,
  History,
  ImageOff,
  Languages as LanguagesIcon,
  LayoutDashboard,
  ListFilter,
  Loader2,
  RefreshCcw,
  ScrollText,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { memo, useCallback, useMemo, useState, useSyncExternalStore } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TextsList } from '@/components/backoffice/texts-list';
import { UncoveredImages } from '@/components/backoffice/uncovered-images';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import {
  fetchTextsOverview,
  type ActivityBucket,
  type AnnotationActivityBucket,
  type Kind,
  type LanguageRow,
  type RecentRow,
  type Status,
  type TextsOverview,
} from '@/services/texts-monitor';

type MatrixPayload = TextsOverview['matrix'];
type CoveragePayload = TextsOverview['coverage'];
type AnnotationHealth = TextsOverview['annotation_health'];

// Status palette is routed through the `--c-status-*` design tokens
// (globals.css). Wash backgrounds and borders use the named utility
// (`bg-status-draft/10`); foreground text needs role-tuned lightness, so
// it consumes the raw HSL channels via arbitrary classes — same pattern
// as KIND_TONE above. A single source of truth still drives the palette.
const STATUS_TONE: Record<Status, string> = {
  Draft:
    'bg-status-draft/10 border-status-draft/20 text-[hsl(var(--c-status-draft-h)_var(--c-status-draft-s)_32%)] dark:text-[hsl(var(--c-status-draft-h)_var(--c-status-draft-s)_75%)]',
  Review:
    'bg-status-review/10 border-status-review/20 text-[hsl(var(--c-status-review-h)_var(--c-status-review-s)_32%)] dark:text-[hsl(var(--c-status-review-h)_var(--c-status-review-s)_75%)]',
  Live: 'bg-status-live/10 border-status-live/20 text-[hsl(var(--c-status-live-h)_var(--c-status-live-s)_28%)] dark:text-[hsl(var(--c-status-live-h)_var(--c-status-live-s)_72%)]',
  Reviewed:
    'bg-status-reviewed/10 border-status-reviewed/20 text-[hsl(var(--c-status-reviewed-h)_var(--c-status-reviewed-s)_42%)] dark:text-[hsl(var(--c-status-reviewed-h)_var(--c-status-reviewed-s)_78%)]',
};

// Mixed canonical-token + role-tuned arbitrary classes: borders use the
// token directly with an opacity modifier; the wash backgrounds and
// foreground text need bespoke lightness, so they route the hue through
// the canonical CSS var (`--c-transcription-h` etc.) so a single source
// still drives the palette while leaving the role-tuned L tunable.
const KIND_TONE: Record<Kind, string> = {
  Transcription:
    'border-transcription/30 bg-[hsl(var(--c-transcription-h)_50%_96%)] text-[hsl(var(--c-transcription-h)_55%_30%)] dark:bg-[hsl(var(--c-transcription-h)_45%_18%)]/40 dark:text-[hsl(var(--c-transcription-h)_45%_75%)]',
  Translation:
    'border-translation/30 bg-[hsl(var(--c-translation-h)_40%_96%)] text-[hsl(var(--c-translation-h)_45%_30%)] dark:bg-[hsl(var(--c-translation-h)_40%_18%)]/40 dark:text-[hsl(var(--c-translation-h)_40%_75%)]',
};

type View = 'overview' | 'recent' | 'browse' | 'uncovered';

function isView(value: string | null): value is View {
  return value === 'overview' || value === 'recent' || value === 'browse' || value === 'uncovered';
}

export function TextsMonitor() {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ['backoffice', 'texts-monitor', 'overview'],
    queryFn: () => fetchTextsOverview(token!),
    enabled: !!token,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const viewParam = searchParams?.get('view') ?? null;
  const view: View = isView(viewParam) ? viewParam : 'overview';

  const setView = useCallback(
    (next: View) => {
      const sp = new URLSearchParams(searchParams?.toString() ?? '');
      if (next === 'overview') sp.delete('view');
      else sp.set('view', next);
      const qs = sp.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <div className="space-y-8 px-6 py-8">
      <Header
        generatedAt={data?.generated_at ?? null}
        loading={isFetching}
        onRefresh={() => void refetch()}
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {t('texts.loadError', { message: (error as Error).message })}
        </div>
      )}

      {data ? (
        <>
          <KpiStrip matrix={data.matrix} coverage={data.coverage} health={data.annotation_health} />

          <ViewSwitcher
            view={view}
            onChange={setView}
            counts={{
              recent: data.recent.length,
              browse: data.matrix.totals.Transcription + data.matrix.totals.Translation,
              uncovered: data.coverage.with_neither,
            }}
          />

          {view === 'overview' && (
            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-5">
                <StatusMatrix matrix={data.matrix} className="xl:col-span-3" />
                <CoverageDonut coverage={data.coverage} className="xl:col-span-2" />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <ActivitySpark
                  activity={data.activity}
                  lastEditAt={data.recent[0]?.modified ?? null}
                />
                <LanguageBreakdown languages={data.languages} />
              </div>
              <AnnotationActivity series={data.annotation_activity} />
            </div>
          )}

          {view === 'recent' && <RecentEdits rows={data.recent} />}

          {view === 'uncovered' && <UncoveredImages />}

          {view === 'browse' && <TextsList />}
        </>
      ) : (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          {isFetching ? <Loader2 className="h-5 w-5 animate-spin" /> : t('texts.noDataYet')}
        </div>
      )}
    </div>
  );
}

// ──────────────────── View switcher ────────────────────

// A sticky segmented control that swaps the page between one focused panel at
// a time — the dashboard charts, or one of the three data tables — instead of
// stacking everything in a single long scroll. Drill-down links from the KPI
// strip and charts route here via the `view` URL param.
const VIEW_ICONS: Record<View, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  browse: ListFilter,
  uncovered: ImageOff,
  recent: History,
};

const VIEW_ORDER: View[] = ['overview', 'browse', 'uncovered', 'recent'];

const ViewSwitcher = memo(function ViewSwitcher({
  view,
  onChange,
  counts,
}: {
  view: View;
  onChange: (view: View) => void;
  counts: { recent: number; browse: number; uncovered: number };
}) {
  const t = useTranslations('backoffice');
  const viewMeta = VIEW_ORDER.map((key) => ({
    key,
    label: t(`texts.view.${key}.label`),
    hint: t(`texts.view.${key}.hint`),
    icon: VIEW_ICONS[key],
  }));
  const active = viewMeta.find((v) => v.key === view) ?? viewMeta[0];
  return (
    <div className="sticky top-0 z-20 -mx-6 border-b border-border/60 bg-background/85 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div
          role="tablist"
          aria-label={t('texts.view.ariaLabel')}
          className="inline-flex items-center gap-1 rounded-xl border bg-muted/30 p-1"
        >
          {viewMeta.map((v) => {
            const Icon = v.icon;
            const isActive = v.key === view;
            const count =
              v.key === 'recent'
                ? counts.recent
                : v.key === 'browse'
                  ? counts.browse
                  : v.key === 'uncovered'
                    ? counts.uncovered
                    : null;
            return (
              <button
                key={v.key}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => onChange(v.key)}
                className={cn(
                  'group flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    isActive
                      ? 'text-[hsl(var(--c-transcription-h)_55%_45%)]'
                      : 'text-muted-foreground'
                  )}
                />
                <span>{v.label}</span>
                {count !== null && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                      isActive ? 'bg-muted text-foreground' : 'bg-muted/60 text-muted-foreground'
                    )}
                  >
                    {count.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="hidden text-xs text-muted-foreground md:block">{active.hint}</p>
      </div>
    </div>
  );
});

// ──────────────────── Header ────────────────────

function Header({
  generatedAt,
  loading,
  onRefresh,
}: {
  generatedAt: string | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const t = useTranslations('backoffice');
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-display text-[11px] uppercase tracking-[0.32em] text-[hsl(var(--c-transcription-h)_55%_38%)] dark:text-[hsl(var(--c-transcription-h)_45%_70%)]">
          {t('texts.eyebrow')}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          {t('texts.title')}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('texts.description')}</p>
      </div>
      <div className="flex items-center gap-3">
        {generatedAt && (
          <span className="text-xs text-muted-foreground">
            {t('texts.snapshot', { datetime: new Date(generatedAt).toLocaleString() })}
          </span>
        )}
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCcw className="mr-2 h-3.5 w-3.5" />
          )}
          {t('texts.refresh')}
        </Button>
      </div>
    </header>
  );
}

// ──────────────────── KPI strip ────────────────────

const KpiStrip = memo(function KpiStrip({
  matrix,
  coverage,
  health,
}: {
  matrix: MatrixPayload;
  coverage: CoveragePayload;
  health: AnnotationHealth;
}) {
  const t = useTranslations('backoffice');
  const kpis = [
    {
      icon: ScrollText,
      label: t('texts.kpi.transcriptions'),
      value: matrix.totals.Transcription,
      sub: t('texts.kpi.empty', { count: matrix.empty_by_kind.Transcription }),
      tone: 'transcription' as const,
      // The KPI is a corpus-wide aggregate; clicking it should open the
      // Browse panel filtered to just that kind so editors can jump from
      // "X transcriptions" to the actual rows in one move.
      href: '?kind=Transcription&view=browse',
    },
    {
      icon: BookOpenText,
      label: t('texts.kpi.translations'),
      value: matrix.totals.Translation,
      sub: t('texts.kpi.empty', { count: matrix.empty_by_kind.Translation }),
      tone: 'translation' as const,
      href: '?kind=Translation&view=browse',
    },
    {
      icon: Sparkles,
      label: t('texts.kpi.imageCoverage'),
      value: pct(coverage.with_either, coverage.images_total),
      sub: t('texts.kpi.ofImages', {
        covered: coverage.with_either.toLocaleString(),
        total: coverage.images_total.toLocaleString(),
      }),
      tone: 'neutral' as const,
      href: undefined,
    },
    {
      icon: Activity,
      label: t('texts.kpi.annotationsPerText'),
      value: health.average_annotations_per_text.toFixed(2),
      sub: t('texts.kpi.regionsLinked', { count: health.annotations_total }),
      tone: 'neutral' as const,
      href: undefined,
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k) => {
        const Icon = k.icon;
        const card = (
          <div
            className={cn(
              'relative overflow-hidden rounded-xl border bg-card px-5 py-4 shadow-[0_1px_0_rgba(31,21,5,0.04)]',
              k.tone === 'transcription' &&
                'ring-1 ring-[hsl(var(--c-transcription-h)_45%_60%)]/15',
              k.tone === 'translation' && 'ring-1 ring-[hsl(var(--c-translation-h)_45%_60%)]/15',
              k.href && 'cursor-pointer transition-shadow hover:shadow-md'
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                {k.label}
              </p>
              <Icon
                className={cn(
                  'h-4 w-4',
                  k.tone === 'transcription' && 'text-[hsl(var(--c-transcription-h)_55%_45%)]',
                  k.tone === 'translation' && 'text-[hsl(var(--c-translation-h)_45%_45%)]',
                  k.tone === 'neutral' && 'text-muted-foreground'
                )}
              />
            </div>
            <p className="mt-2 font-display text-3xl font-semibold leading-none">{k.value}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">{k.sub}</p>
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-x-5 bottom-0 h-px',
                k.tone === 'transcription' && 'bg-[hsl(var(--c-transcription-h)_55%_45%)]/30',
                k.tone === 'translation' && 'bg-[hsl(var(--c-translation-h)_45%_45%)]/30',
                k.tone === 'neutral' && 'bg-border'
              )}
            />
          </div>
        );
        return k.href ? (
          <Link key={k.label} href={k.href} scroll={false}>
            {card}
          </Link>
        ) : (
          <div key={k.label}>{card}</div>
        );
      })}
    </div>
  );
});

// ──────────────────── Status matrix ────────────────────

const StatusMatrix = memo(function StatusMatrix({
  matrix,
  className,
}: {
  matrix: MatrixPayload;
  className?: string;
}) {
  const t = useTranslations('backoffice');
  const max = useMemo(() => {
    let m = 0;
    for (const kind of matrix.kinds) {
      for (const s of matrix.statuses) {
        m = Math.max(m, matrix.by_kind[kind]?.[s] ?? 0);
      }
    }
    return m;
  }, [matrix]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{t('texts.lifecycle.title')}</CardTitle>
        <p className="text-xs text-muted-foreground">{t('texts.lifecycle.description')}</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          <div className="grid grid-cols-[140px_repeat(4,1fr)] items-center gap-3 px-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span />
            {matrix.statuses.map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[s])} />
                {s}
              </div>
            ))}
          </div>
          {matrix.kinds.map((kind) => (
            <div
              key={kind}
              className="grid grid-cols-[140px_repeat(4,1fr)] items-center gap-3 rounded-lg border bg-background/40 px-1.5 py-2"
            >
              <div className="flex items-center gap-2 pl-2">
                <span
                  aria-hidden
                  className={cn(
                    'inline-block h-2 w-2 rounded-full',
                    kind === 'Transcription' ? 'bg-transcription' : 'bg-translation'
                  )}
                />
                <div>
                  <p className="text-sm font-medium leading-tight">{kind}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t('texts.lifecycle.total', { count: matrix.totals[kind] })}
                  </p>
                </div>
              </div>
              {matrix.statuses.map((s) => {
                const n = matrix.by_kind[kind]?.[s] ?? 0;
                const w = max ? Math.max(2, (n / max) * 100) : 0;
                return (
                  <Link
                    key={s}
                    href={`?kind=${kind}&status=${s}&view=browse`}
                    scroll={false}
                    className={cn(
                      'flex flex-col gap-1 rounded-md px-1 py-0.5',
                      n > 0 && 'hover:bg-accent/30'
                    )}
                    title={t('texts.lifecycle.cellTitle', {
                      count: n,
                      kind: kind.toLowerCase(),
                      status: s,
                    })}
                  >
                    <span className="font-display text-lg font-semibold leading-none">
                      {n.toLocaleString()}
                    </span>
                    <span
                      aria-hidden
                      className="h-1.5 rounded-full bg-muted"
                      style={{ position: 'relative' }}
                    >
                      <span
                        className={cn(
                          'absolute inset-y-0 left-0 rounded-full transition-[width] duration-500',
                          STATUS_BAR[s]
                        )}
                        style={{ width: n ? `${w}%` : 0 }}
                      />
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

const STATUS_DOT: Record<Status, string> = {
  Draft: 'bg-status-draft',
  Review: 'bg-status-review',
  Live: 'bg-status-live',
  Reviewed: 'bg-status-reviewed',
};

const STATUS_BAR: Record<Status, string> = {
  Draft: 'bg-status-draft/70',
  Review: 'bg-status-review/70',
  Live: 'bg-status-live/70',
  Reviewed: 'bg-status-reviewed/70',
};

// ──────────────────── Coverage donut ────────────────────

const CoverageDonut = memo(function CoverageDonut({
  coverage,
  className,
}: {
  coverage: CoveragePayload;
  className?: string;
}) {
  const t = useTranslations('backoffice');
  const total = Math.max(1, coverage.images_total);
  // Each segment carries the uncovered-images mode it should drill into
  // when clicked (or null for segments that don't correspond to a
  // straightforward "show me what's missing" view).
  const segs = useMemo(
    () => [
      {
        label: t('texts.coverage.both'),
        value: coverage.with_both,
        color: 'hsl(160 55% 38%)',
        coverage: null as string | null,
      },
      {
        label: t('texts.coverage.transcriptionOnly'),
        value: Math.max(0, coverage.with_transcription - coverage.with_both),
        // Use design token from globals.css so the palette stays in sync.
        color: 'hsl(var(--c-transcription-h) var(--c-transcription-s) var(--c-transcription-l))',
        coverage: 'translation', // missing translation
      },
      {
        label: t('texts.coverage.translationOnly'),
        value: Math.max(0, coverage.with_translation - coverage.with_both),
        color: 'hsl(var(--c-translation-h) var(--c-translation-s) var(--c-translation-l))',
        coverage: 'transcription', // missing transcription
      },
      {
        label: t('texts.coverage.neither'),
        value: coverage.with_neither,
        color: 'hsl(25 8% 80%)',
        coverage: 'either', // missing both
      },
    ],
    [coverage, t]
  );
  const conic = useMemo(() => {
    let acc = 0;
    const stops: string[] = [];
    for (const s of segs) {
      const start = (acc / total) * 360;
      acc += s.value;
      const end = (acc / total) * 360;
      stops.push(`${s.color} ${start}deg ${end}deg`);
    }
    return `conic-gradient(${stops.join(', ')})`;
  }, [segs, total]);
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{t('texts.coverage.title')}</CardTitle>
        <p className="text-xs text-muted-foreground">{t('texts.coverage.description')}</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div
            className="relative h-36 w-36 shrink-0 rounded-full"
            style={{ background: conic }}
            aria-hidden
          >
            <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-card text-center">
              <span className="font-display text-2xl font-semibold leading-none">
                {pct(coverage.with_either, coverage.images_total)}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {t('texts.coverage.covered')}
              </span>
            </div>
          </div>
          <ul className="flex-1 space-y-2 text-sm">
            {segs.map((s) => {
              const display = (
                <>
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: s.color }}
                    />
                    <span className="text-muted-foreground">{s.label}</span>
                  </span>
                  <span className="font-mono text-xs">
                    {s.value.toLocaleString()}
                    <span className="ml-1 text-muted-foreground">
                      ({pct(s.value, coverage.images_total)})
                    </span>
                  </span>
                </>
              );
              return s.coverage && s.value > 0 ? (
                <li key={s.label}>
                  <Link
                    href={`?coverage=${s.coverage}&view=uncovered`}
                    scroll={false}
                    className="flex items-center justify-between gap-3 rounded-md px-1 py-0.5 hover:bg-accent/30"
                  >
                    {display}
                  </Link>
                </li>
              ) : (
                <li key={s.label} className="flex items-center justify-between gap-3 px-1">
                  {display}
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
});

// ──────────────────── Activity sparkline ────────────────────

const ActivitySpark = memo(function ActivitySpark({
  activity,
  lastEditAt,
}: {
  activity: ActivityBucket[];
  lastEditAt: string | null;
}) {
  const t = useTranslations('backoffice');
  const max = Math.max(1, ...activity.map((a) => a.transcription + a.translation));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{t('texts.activity.title')}</CardTitle>
        <p className="text-xs text-muted-foreground">{t('texts.activity.description')}</p>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('texts.activity.empty')}
            {lastEditAt && (
              <>
                {' '}
                <span className="text-muted-foreground/80">
                  {t('texts.activity.lastEdit', {
                    days: daysSince(t, lastEditAt),
                    date: new Date(lastEditAt).toLocaleDateString(),
                  })}
                </span>
              </>
            )}
          </p>
        ) : (
          <div className="flex h-32 items-end gap-1">
            {activity.map((a) => {
              const total = a.transcription + a.translation;
              const h = (total / max) * 100;
              const tShare = total ? (a.transcription / total) * h : 0;
              const xShare = total ? (a.translation / total) * h : 0;
              return (
                <div
                  key={a.date}
                  className="group relative flex h-full flex-1 flex-col-reverse"
                  title={t('texts.activity.barTitle', {
                    date: a.date,
                    transcription: a.transcription,
                    translation: a.translation,
                  })}
                >
                  <span
                    className="rounded-t-sm bg-transcription/80"
                    style={{ height: `${tShare}%` }}
                  />
                  <span className="bg-translation/80" style={{ height: `${xShare}%` }} />
                  <span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-[10px] shadow-md group-hover:block">
                    {a.date} · {total}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-sm bg-transcription" />
            {t('texts.legend.transcription')}
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-sm bg-translation" />
            {t('texts.legend.translation')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
});

// ──────────────────── Annotation activity ────────────────────

// New text-annotation Graph rows over the last 30 days. Complements
// `ActivitySpark` (which tracks text edits, not region drawing).
const AnnotationActivity = memo(function AnnotationActivity({
  series,
}: {
  series: AnnotationActivityBucket[];
}) {
  const t = useTranslations('backoffice');
  const max = Math.max(1, ...series.map((s) => s.count));
  const total = series.reduce((a, s) => a + s.count, 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">
          {t('texts.annotationActivity.title')}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('texts.annotationActivity.description', { count: total })}
        </p>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          // Historical Graphs predate the `created` timestamp added in
          // migration 0008, so the sparkline starts empty even on a fully
          // populated corpus. Calling that out beats showing nothing.
          <p className="text-sm text-muted-foreground">{t('texts.annotationActivity.empty')}</p>
        ) : (
          <div className="flex h-32 items-end gap-1">
            {series.map((s) => {
              const h = (s.count / max) * 100;
              return (
                <div
                  key={s.date}
                  className="group relative flex h-full flex-1 flex-col-reverse"
                  title={t('texts.annotationActivity.barTitle', { date: s.date, count: s.count })}
                >
                  <span
                    className="rounded-t-sm bg-[hsl(160_55%_45%)]/80"
                    style={{ height: `${h}%` }}
                  />
                  <span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-[10px] shadow-md group-hover:block">
                    {s.date} · {s.count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// ──────────────────── Languages ────────────────────

const LanguageBreakdown = memo(function LanguageBreakdown({
  languages,
}: {
  languages: LanguageRow[];
}) {
  const t = useTranslations('backoffice');
  const max = Math.max(1, ...languages.map((l) => l.total));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <LanguagesIcon className="h-4 w-4 text-muted-foreground" />
          {t('texts.languages.title')}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t('texts.languages.description')}</p>
      </CardHeader>
      <CardContent>
        {languages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('texts.languages.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {languages.map((l) => {
              const filterValue = l.language === '(unset)' ? '__unset__' : l.language;
              return (
                <li key={l.language}>
                  <Link
                    href={`?language=${encodeURIComponent(filterValue)}&view=browse`}
                    scroll={false}
                    className="grid grid-cols-[80px_1fr_64px] items-center gap-3 rounded-md py-0.5 hover:bg-accent/30"
                  >
                    <span
                      className={cn(
                        'truncate font-mono text-xs uppercase tracking-wider',
                        l.language === '(unset)' && 'italic text-muted-foreground'
                      )}
                    >
                      {l.language}
                    </span>
                    <span className="relative block h-2 overflow-hidden rounded-full bg-muted">
                      <span
                        className="absolute inset-y-0 left-0 bg-transcription/70"
                        style={{ width: `${(l.transcription / max) * 100}%` }}
                      />
                      <span
                        className="absolute inset-y-0 bg-translation/70"
                        style={{
                          left: `${(l.transcription / max) * 100}%`,
                          width: `${(l.translation / max) * 100}%`,
                        }}
                      />
                    </span>
                    <span className="text-right font-mono text-xs">{l.total.toLocaleString()}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
});

// ──────────────────── Recent edits ────────────────────

const RecentEdits = memo(function RecentEdits({ rows }: { rows: RecentRow[] }) {
  const t = useTranslations('backoffice');
  const [filter, setFilter] = useState<'all' | Kind>('all');
  const filtered = filter === 'all' ? rows : rows.filter((r) => r.type === filter);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base font-medium">{t('texts.recent.title')}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {t('texts.recent.description', { count: rows.length })}
          </p>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | Kind)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs">
              {t('texts.recent.filterAll')}
            </TabsTrigger>
            <TabsTrigger value="Transcription" className="text-xs">
              {t('texts.legend.transcription')}
            </TabsTrigger>
            <TabsTrigger value="Translation" className="text-xs">
              {t('texts.legend.translation')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value={filter} />
        </Tabs>
      </CardHeader>
      <CardContent className="px-0">
        {filtered.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            {t('texts.recent.empty')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">{t('texts.recent.colKind')}</TableHead>
                  <TableHead>{t('texts.recent.colImage')}</TableHead>
                  <TableHead className="w-[90px]">{t('texts.recent.colStatus')}</TableHead>
                  <TableHead className="w-[80px]">{t('texts.recent.colLang')}</TableHead>
                  <TableHead className="w-[90px] text-right">
                    {t('texts.recent.colChars')}
                  </TableHead>
                  <TableHead className="w-[90px] text-right">
                    {t('texts.recent.colRegions')}
                  </TableHead>
                  <TableHead className="w-[180px]">{t('texts.recent.colModified')}</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const panel = r.type === 'Transcription' ? 'transcription' : 'translation';
                  const editorLink = `/backoffice/image-texts/${r.id}`;
                  const viewerLink = r.item_part_id
                    ? `/manuscripts/${r.item_part_id}/images/${r.item_image_id}#mode=text&panel=${panel}`
                    : null;
                  return (
                    <TableRow
                      key={r.id}
                      className="group cursor-pointer hover:bg-accent/30"
                      onClick={() => {
                        window.location.href = editorLink;
                      }}
                    >
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]',
                            KIND_TONE[r.type]
                          )}
                        >
                          {r.type === 'Transcription'
                            ? t('texts.recent.kindTranscriptionAbbr')
                            : t('texts.recent.kindTranslationAbbr')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={editorLink}
                          className="flex flex-col"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="font-medium leading-tight hover:underline">
                            {r.label}
                          </span>
                          {r.locus && (
                            <span className="text-[11px] text-muted-foreground">
                              {t('texts.recent.folio', { locus: r.locus })}
                            </span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]',
                            STATUS_TONE[r.status]
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[r.status])}
                          />
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'font-mono text-xs',
                            !r.language && 'text-muted-foreground/60 italic'
                          )}
                        >
                          {r.language || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {r.is_empty ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            {t('texts.recent.emptyChars')}
                          </span>
                        ) : (
                          r.char_count.toLocaleString()
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {r.annotation_count}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <RelativeTime iso={r.modified} />
                      </TableCell>
                      <TableCell>
                        {viewerLink ? (
                          <Link
                            href={viewerLink}
                            target="_blank"
                            rel="noopener"
                            onClick={(e) => e.stopPropagation()}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            title={t('texts.recent.openViewer')}
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// One shared minute-tick clock so each row doesn't open its own interval.
// The previous version called `setInterval` inside every subscribe call,
// which meant N visible RelativeTime rows ran N intervals — defeating the
// "shared" claim in the comment. This pools all listeners under a single
// timer that's only active while at least one row is mounted.
const minuteListeners = new Set<() => void>();
let minuteIntervalId: ReturnType<typeof setInterval> | null = null;
function subscribeMinute(cb: () => void) {
  minuteListeners.add(cb);
  if (minuteIntervalId === null) {
    minuteIntervalId = setInterval(() => {
      for (const listener of minuteListeners) listener();
    }, 60_000);
  }
  return () => {
    minuteListeners.delete(cb);
    if (minuteListeners.size === 0 && minuteIntervalId !== null) {
      clearInterval(minuteIntervalId);
      minuteIntervalId = null;
    }
  };
}
function getMinute() {
  return Math.floor(Date.now() / 60_000);
}

function RelativeTime({ iso }: { iso: string }) {
  const t = useTranslations('backoffice');
  const minute = useSyncExternalStore(
    subscribeMinute,
    getMinute,
    () => 0 // SSR snapshot — we just render the absolute date.
  );
  const label = useMemo(() => {
    if (minute === 0) return new Date(iso).toLocaleDateString();
    const diffMin = minute - Math.floor(new Date(iso).getTime() / 60_000);
    if (diffMin < 1) return t('texts.relative.justNow');
    if (diffMin < 60) return t('texts.relative.minutesAgo', { count: diffMin });
    if (diffMin < 60 * 24) return t('texts.relative.hoursAgo', { count: Math.round(diffMin / 60) });
    if (diffMin < 60 * 24 * 7)
      return t('texts.relative.daysAgo', { count: Math.round(diffMin / (60 * 24)) });
    return new Date(iso).toLocaleDateString();
  }, [iso, minute, t]);
  return <span title={new Date(iso).toLocaleString()}>{label}</span>;
}

function pct(part: number, whole: number): string {
  if (!whole) return '—';
  return `${Math.round((part / whole) * 100)}%`;
}

function daysSince(t: ReturnType<typeof useTranslations>, iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return t('texts.relative.today');
  return t('texts.relative.daysCount', { count: days });
}
