'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Save, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { FieldLabel } from '@/components/backoffice/common/help-tooltip';
import { CompletenessChecklist } from '@/components/backoffice/common/completeness-checklist';
import { UnsavedChangesBar } from '@/components/backoffice/common/unsaved-changes-bar';
import { CatalogueNumbersSection } from './catalogue-numbers-section';
import { DescriptionsSection } from './descriptions-section';
import { MsDescSection } from './msdesc-section';
import { CurrentLocationSection } from './current-location-section';
import { ItemPartsTab } from './item-parts-tab';
import {
  getHistoricalItem,
  updateHistoricalItem,
  deleteHistoricalItem,
} from '@/services/backoffice/manuscripts';
import { getFormats, getDates } from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { useUnsavedGuard } from '@/hooks/backoffice/use-unsaved-guard';
import { useKeyboardShortcut } from '@/hooks/backoffice/use-keyboard-shortcut';
import { useRecentEntities } from '@/hooks/backoffice/use-recent-entities';
import type { HistoricalItemDetail } from '@/types/backoffice';
import { useModelLabels } from '@/contexts/model-labels-context';

interface ManuscriptWorkspaceProps {
  itemId: number;
}

export function ManuscriptWorkspace({ itemId }: ManuscriptWorkspaceProps) {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getLabel, getPluralLabel } = useModelLabels();

  const ITEM_TYPES = [
    { value: 'agreement', label: t('manuscriptWorkspace.typeAgreement') },
    { value: 'charter', label: t('manuscriptWorkspace.typeCharter') },
    { value: 'letter', label: t('manuscriptWorkspace.typeLetter') },
  ];
  const historicalItemLabel = getLabel('historicalItem');
  const catalogueLabelPlural = getPluralLabel('catalogueNumber');
  const dateLabel = getLabel('date');
  const hairTypeLabel = getLabel('fieldHairType');

  const { data: item, isLoading } = useQuery({
    queryKey: backofficeKeys.manuscripts.detail(itemId),
    queryFn: () => getHistoricalItem(token!, itemId),
    enabled: !!token,
  });

  const { data: formats } = useQuery({
    queryKey: backofficeKeys.formats.all(),
    queryFn: () => getFormats(token!),
    enabled: !!token,
  });

  const { data: dates } = useQuery({
    queryKey: backofficeKeys.dates.all(),
    queryFn: () => getDates(token!),
    enabled: !!token,
  });

  const { track } = useRecentEntities();

  const [draft, setDraft] = useState<Partial<HistoricalItemDetail>>({});
  const [dirty, setDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (item) {
      const label =
        item.catalogue_numbers.length > 0
          ? item.catalogue_numbers.map((cn) => `${cn.catalogue_label} ${cn.number}`).join(', ')
          : `${historicalItemLabel} #${item.id}`;
      track({ label, href: `/backoffice/manuscripts/${itemId}`, type: historicalItemLabel });
      // Sync draft from item; intentional setState in effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft({
        type: item.type,
        format: item.format,
        language: item.language,
        hair_type: item.hair_type,
        date: item.date,
        probable_text_date: item.probable_text_date,
        dating_notes: item.dating_notes,
      });
      setDirty(false);
    }
  }, [item, itemId, track, historicalItemLabel]);

  const updateField = <K extends keyof typeof draft>(field: K, value: (typeof draft)[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  // Warn before leaving with unsaved changes
  useUnsavedGuard(dirty);

  const saveMut = useMutation({
    mutationFn: () => updateHistoricalItem(token!, itemId, draft),
    onSuccess: () => {
      toast.success(t('manuscriptWorkspace.toastSaved', { label: historicalItemLabel }));
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.manuscripts.detail(itemId),
      });
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.manuscripts.all(),
      });
      setDirty(false);
    },
    onError: (err) => {
      toast.error(
        t('manuscriptWorkspace.toastFailedSave', { label: historicalItemLabel.toLowerCase() }),
        {
          description: formatApiError(err),
        }
      );
    },
  });

  // Cmd+S to save
  useKeyboardShortcut(
    'mod+s',
    () => {
      if (dirty && !saveMut.isPending) saveMut.mutate();
    },
    dirty
  );

  const deleteMut = useMutation({
    mutationFn: () => deleteHistoricalItem(token!, itemId),
    onSuccess: () => {
      toast.success(t('manuscriptWorkspace.toastDeleted', { label: historicalItemLabel }));
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.manuscripts.all(),
      });
      router.push('/backoffice/manuscripts');
    },
    onError: (err) => {
      toast.error(
        t('manuscriptWorkspace.toastFailedDelete', { label: historicalItemLabel.toLowerCase() }),
        {
          description: formatApiError(err),
        }
      );
    },
  });

  if (isLoading || !item) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const heading = (() => {
    if (item.catalogue_numbers.length > 0) {
      return item.catalogue_numbers.map((cn) => `${cn.catalogue_label} ${cn.number}`).join(', ');
    }
    const firstPart = item.item_parts[0];
    if (firstPart?.display_label) {
      return firstPart.display_label;
    }
    return `${historicalItemLabel} #${item.id}`;
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/backoffice/manuscripts"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-xl font-semibold">{heading}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{item.type}</Badge>
            {item.date_display && (
              <span className="text-sm text-muted-foreground">{item.date_display}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {t('manuscriptWorkspace.deleteButton')}
          </Button>
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={!dirty || saveMut.isPending}>
            {saveMut.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1" />
            )}
            {t('manuscriptWorkspace.saveButton')}
          </Button>
        </div>
      </div>

      {/* Relationship summary bar */}
      {(() => {
        const partsCount = item.item_parts.length;
        const imagesCount = item.item_parts.reduce((sum, p) => sum + (p.images?.length ?? 0), 0);
        const catalogueCount = item.catalogue_numbers.length;
        const descriptionsCount = item.descriptions.length;
        const badges = [
          [t('manuscriptWorkspace.badgeParts'), partsCount],
          [t('manuscriptWorkspace.badgeImages'), imagesCount],
          [catalogueLabelPlural, catalogueCount],
          [t('manuscriptWorkspace.badgeDescriptions'), descriptionsCount],
        ] as const;
        return (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {badges.map(([label, count]) => (
              <Badge key={label} variant="secondary" className="font-normal text-muted-foreground">
                {label} ({count})
              </Badge>
            ))}
          </div>
        );
      })()}

      {/* Completeness checklist */}
      <CompletenessChecklist
        items={[
          {
            label: t('manuscriptWorkspace.checklistCurrentLocation'),
            complete: item.item_parts.length > 0 && item.item_parts[0].current_item != null,
            value: item.item_parts[0]?.current_item_display ?? undefined,
          },
          {
            label: dateLabel,
            complete: item.date != null,
            value: item.date_display ?? undefined,
          },
          {
            label: t('manuscriptWorkspace.checklistFormat'),
            complete: item.format != null,
            value: item.format_display ?? undefined,
          },
          {
            label: t('manuscriptWorkspace.checklistLanguage'),
            complete: !!item.language,
          },
          {
            label: catalogueLabelPlural,
            complete: item.catalogue_numbers.length > 0,
            value:
              item.catalogue_numbers.length > 0
                ? t('manuscriptWorkspace.entryCount', { count: item.catalogue_numbers.length })
                : undefined,
          },
          {
            label: t('manuscriptWorkspace.checklistDescriptions'),
            complete: item.descriptions.length > 0,
            value:
              item.descriptions.length > 0
                ? t('manuscriptWorkspace.entryCount', { count: item.descriptions.length })
                : undefined,
          },
          {
            label: t('manuscriptWorkspace.checklistParts'),
            complete: item.item_parts.length > 0,
            value:
              item.item_parts.length > 0
                ? t('manuscriptWorkspace.partCount', { count: item.item_parts.length })
                : undefined,
          },
        ]}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">{t('manuscriptWorkspace.tabDetails')}</TabsTrigger>
          <TabsTrigger value="parts">
            {t('manuscriptWorkspace.tabPartsLabel')} ({item.item_parts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-4">
          {/* Basic fields */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <FieldLabel helpField="manuscript.type">
                {t('manuscriptWorkspace.fieldType')}
              </FieldLabel>
              <Select value={draft.type ?? ''} onValueChange={(val) => updateField('type', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <FieldLabel helpField="manuscript.format">
                {t('manuscriptWorkspace.fieldFormat')}
              </FieldLabel>
              <Select
                value={String(draft.format ?? '__none')}
                onValueChange={(val) =>
                  updateField('format', val === '__none' ? null : Number(val))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{t('manuscriptWorkspace.selectNone')}</SelectItem>
                  {(formats ?? []).map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <FieldLabel helpField="manuscript.date">{dateLabel}</FieldLabel>
              <Select
                value={String(draft.date ?? '__none')}
                onValueChange={(val) => updateField('date', val === '__none' ? null : Number(val))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{t('manuscriptWorkspace.selectNone')}</SelectItem>
                  {(dates ?? []).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <FieldLabel helpField="manuscript.probableTextDate">
                {t('manuscriptWorkspace.fieldProbableDate')}
              </FieldLabel>
              <Input
                value={draft.probable_text_date ?? ''}
                onChange={(e) => updateField('probable_text_date', e.target.value)}
                placeholder={t('manuscriptWorkspace.probableDatePlaceholder')}
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel helpField="manuscript.language">
                {t('manuscriptWorkspace.fieldLanguage')}
              </FieldLabel>
              <Input
                value={draft.language ?? ''}
                onChange={(e) => updateField('language', e.target.value)}
                placeholder={t('manuscriptWorkspace.languagePlaceholder')}
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel helpField="manuscript.hair_type">{hairTypeLabel}</FieldLabel>
              <Input
                value={draft.hair_type ?? ''}
                onChange={(e) => updateField('hair_type', e.target.value)}
                placeholder={t('manuscriptWorkspace.hairTypePlaceholder')}
              />
            </div>

            <div className="space-y-1.5 lg:col-span-3">
              <FieldLabel helpField="manuscript.datingNotes">
                {t('manuscriptWorkspace.fieldDatingNotes')}
              </FieldLabel>
              <textarea
                value={draft.dating_notes ?? ''}
                onChange={(e) => updateField('dating_notes', e.target.value)}
                placeholder={t('manuscriptWorkspace.datingNotesPlaceholder')}
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Current Location */}
          <CurrentLocationSection
            historicalItemId={itemId}
            itemParts={item.item_parts}
            onNavigateToParts={() => setActiveTab('parts')}
          />

          {/* Catalogue Numbers */}
          <CatalogueNumbersSection
            historicalItemId={itemId}
            catalogueNumbers={item.catalogue_numbers}
          />

          {/* Structured TEI description (msDesc) */}
          <MsDescSection historicalItemId={itemId} itemParts={item.item_parts} />

          {/* Descriptions */}
          <DescriptionsSection historicalItemId={itemId} descriptions={item.descriptions} />
        </TabsContent>

        <TabsContent value="parts" className="mt-4">
          <ItemPartsTab historicalItemId={itemId} itemParts={item.item_parts} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete this ${historicalItemLabel.toLowerCase()}?`}
        description={`This will permanently delete this ${historicalItemLabel.toLowerCase()} and all related parts, images, and texts.`}
        confirmLabel="Delete"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />

      <UnsavedChangesBar
        visible={dirty}
        onSave={() => saveMut.mutate()}
        onDiscard={() => {
          if (item) {
            setDraft({
              type: item.type,
              format: item.format,
              language: item.language,
              hair_type: item.hair_type,
              date: item.date,
              probable_text_date: item.probable_text_date,
              dating_notes: item.dating_notes,
            });
            setDirty(false);
          }
        }}
        saving={saveMut.isPending}
      />
    </div>
  );
}
