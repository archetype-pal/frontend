'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldLabel } from '@/components/backoffice/common/help-tooltip';
import {
  createHistoricalItem,
  createItemPart,
  createCurrentItem,
  deleteHistoricalItem,
  deleteCurrentItem,
  getRepositories,
  getDates,
} from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { walkPaginated } from '@/lib/backoffice/walk-paginated';
import { authFetch } from '@/lib/api-fetch';
import { toast } from 'sonner';
import type { CurrentItemOption, Repository } from '@/types/backoffice';
import { useModelLabels } from '@/contexts/model-labels-context';

export default function NewManuscriptPage() {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const router = useRouter();
  const { getLabel } = useModelLabels();

  const ITEM_TYPES = [
    { value: 'agreement', label: t('manuscriptsNew.typeAgreement') },
    { value: 'charter', label: t('manuscriptsNew.typeCharter') },
    { value: 'letter', label: t('manuscriptsNew.typeLetter') },
  ];
  const historicalItemLabel = getLabel('historicalItem');
  const shelfmarkLabel = getLabel('fieldShelfmark');
  const dateLabel = getLabel('date');

  // Location fields
  const [repository, setRepository] = useState('');
  const [shelfmark, setShelfmark] = useState('');
  const [locus, setLocus] = useState('');

  // Historical identity fields
  const [type, setType] = useState('agreement');
  const [language, setLanguage] = useState('');
  const [date, setDate] = useState('');
  const [probableTextDate, setProbableTextDate] = useState('');
  const [datingNotes, setDatingNotes] = useState('');

  const { data: repositoriesData } = useQuery({
    queryKey: backofficeKeys.repositories.all(),
    queryFn: () => getRepositories(token!),
    enabled: !!token,
  });

  const { data: datesData } = useQuery({
    queryKey: backofficeKeys.dates.all(),
    queryFn: () => getDates(token!),
    enabled: !!token,
  });

  const repositories: Repository[] = repositoriesData ?? [];
  const dates = datesData ?? [];

  const createMut = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Not authenticated');

      let createdCurrentItemId: number | null = null;
      let createdHistoricalItemId: number | null = null;

      try {
        // Step 1: Find or create CurrentItem (if repository & shelfmark provided).
        // Walk all pages — `limit: 500` was silently capped at DRF's max_limit
        // (100), so for repositories with >100 current items the find could
        // miss an existing match and create a duplicate `(repository, shelfmark)`
        // row. The endpoint doesn't expose `?shelfmark=` filtering, so a full
        // walk is the only correct option.
        let currentItemId: number | null = null;
        if (repository && shelfmark.trim()) {
          const existing = await walkPaginated<CurrentItemOption>(
            `/api/v1/manuscripts/management/current-items/?repository=${Number(repository)}&limit=100`,
            (path) => authFetch(path, token)
          );
          const match = existing.find(
            (ci) => ci.shelfmark.toLowerCase() === shelfmark.trim().toLowerCase()
          );
          if (match) {
            currentItemId = match.id;
          } else {
            const newCi = await createCurrentItem(token, {
              repository: Number(repository),
              shelfmark: shelfmark.trim(),
            });
            currentItemId = newCi.id;
            createdCurrentItemId = newCi.id;
          }
        }

        // Step 2: Create HistoricalItem
        const normalizedProbableTextDate = probableTextDate.trim();
        const normalizedDatingNotes = datingNotes.trim();
        const historicalItem = await createHistoricalItem(token, {
          type,
          language: language || undefined,
          date: date ? Number(date) : undefined,
          probable_text_date: normalizedProbableTextDate || undefined,
          dating_notes: normalizedDatingNotes || undefined,
        });
        createdHistoricalItemId = historicalItem.id;

        // Step 3: Create ItemPart linking them
        if (currentItemId != null) {
          await createItemPart(token, {
            historical_item: historicalItem.id,
            current_item: currentItemId,
            current_item_locus: locus.trim() || '',
          });
        }

        return historicalItem;
      } catch (err) {
        const cleanupFailures: string[] = [];

        if (createdHistoricalItemId != null) {
          try {
            await deleteHistoricalItem(token, createdHistoricalItemId);
          } catch {
            cleanupFailures.push(historicalItemLabel.toLowerCase());
          }
        }

        if (createdCurrentItemId != null) {
          try {
            await deleteCurrentItem(token, createdCurrentItemId);
          } catch {
            cleanupFailures.push('physical volume');
          }
        }

        if (cleanupFailures.length > 0) {
          throw new Error(
            `${formatApiError(err)} Automatic cleanup also failed for the ${cleanupFailures.join(
              ' and '
            )}.`
          );
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      toast.success(t('manuscriptsNew.toastCreated', { label: historicalItemLabel }));
      router.push(`/backoffice/manuscripts/${data.id}`);
    },
    onError: (err) => {
      toast.error(
        t('manuscriptsNew.toastFailedCreate', { label: historicalItemLabel.toLowerCase() }),
        {
          description: formatApiError(err),
        }
      );
    },
  });

  const showShelfmarkWarning = repository && !shelfmark.trim();

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/backoffice/manuscripts"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold">
          {t('manuscriptsNew.pageTitle', { label: historicalItemLabel })}
        </h1>
      </div>

      {/* Section 1: Physical Location */}
      <div className="space-y-4 rounded-lg border p-6">
        <div>
          <h2 className="text-sm font-medium">{t('manuscriptsNew.sectionLocationTitle')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('manuscriptsNew.sectionLocationDesc')}
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel helpField="currentLocation.repository">
              {t('manuscriptsNew.fieldRepository')}
            </FieldLabel>
            <Select value={repository} onValueChange={setRepository}>
              <SelectTrigger>
                <SelectValue placeholder={t('manuscriptsNew.repositoryPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {repositories.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.label || r.name} ({r.place})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <FieldLabel helpField="currentLocation.shelfmark">{shelfmarkLabel}</FieldLabel>
            <Input
              value={shelfmark}
              onChange={(e) => setShelfmark(e.target.value)}
              placeholder={t('manuscriptsNew.shelfmarkPlaceholder')}
            />
            {showShelfmarkWarning && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                {t('manuscriptsNew.shelfmarkWarning', {
                  shelfmark: shelfmarkLabel.toLowerCase(),
                  item: historicalItemLabel.toLowerCase(),
                })}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <FieldLabel helpField="itemPart.locus">
              {t('manuscriptsNew.fieldLocus')}{' '}
              <span className="text-muted-foreground font-normal">
                {t('manuscriptsNew.locusOptional')}
              </span>
            </FieldLabel>
            <Input
              value={locus}
              onChange={(e) => setLocus(e.target.value)}
              placeholder={t('manuscriptsNew.locusPlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Historical Identity */}
      <div className="space-y-4 rounded-lg border p-6">
        <div>
          <h2 className="text-sm font-medium">{t('manuscriptsNew.sectionIdentityTitle')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('manuscriptsNew.sectionIdentityDesc')}
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel helpField="manuscript.type">{t('manuscriptsNew.fieldType')}</FieldLabel>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map((it) => (
                  <SelectItem key={it.value} value={it.value}>
                    {it.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <FieldLabel helpField="manuscript.language">
              {t('manuscriptsNew.fieldLanguage')}{' '}
              <span className="text-muted-foreground font-normal">
                {t('manuscriptsNew.languageOptional')}
              </span>
            </FieldLabel>
            <Input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder={t('manuscriptsNew.languagePlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel helpField="manuscript.date">
              {dateLabel}{' '}
              <span className="text-muted-foreground font-normal">
                {t('manuscriptsNew.fieldDate')}
              </span>
            </FieldLabel>
            <Select value={date} onValueChange={setDate}>
              <SelectTrigger>
                <SelectValue placeholder={t('manuscriptsNew.datePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {dates.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <FieldLabel helpField="manuscript.probableTextDate">
              {t('manuscriptsNew.fieldProbableDate')}{' '}
              <span className="text-muted-foreground font-normal">
                {t('manuscriptsNew.probableDateOptional')}
              </span>
            </FieldLabel>
            <Input
              value={probableTextDate}
              onChange={(e) => setProbableTextDate(e.target.value)}
              placeholder={t('manuscriptsNew.probableDatePlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel helpField="manuscript.datingNotes">
              {t('manuscriptsNew.fieldDatingNotes')}{' '}
              <span className="text-muted-foreground font-normal">
                {t('manuscriptsNew.datingNotesOptional')}
              </span>
            </FieldLabel>
            <textarea
              value={datingNotes}
              onChange={(e) => setDatingNotes(e.target.value)}
              placeholder={t('manuscriptsNew.datingNotesPlaceholder')}
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      <Button
        onClick={() => createMut.mutate()}
        disabled={createMut.isPending || !type}
        className="w-full"
      >
        {createMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        {t('manuscriptsNew.createButton')}
      </Button>
    </div>
  );
}
