'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, PenTool, ExternalLink, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { EntityEditorActions } from '@/components/backoffice/common/entity-editor-actions';
import {
  BackofficeErrorState,
  BackofficeLoadingState,
} from '@/components/backoffice/common/query-state';
import { getScribe, updateScribe, deleteScribe } from '@/services/backoffice/scribes';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { useEntityEditor } from '@/hooks/backoffice/use-entity-editor';
import { walkPaginated } from '@/lib/backoffice/walk-paginated';
import { authFetch } from '@/lib/api-fetch';
import type { AdminHandListItem } from '@/types/backoffice';

export default function ScribeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('backoffice');
  const { id: rawId } = use(params);
  const id = Number(rawId);
  const { token } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const editor = useEntityEditor({
    id,
    queryKey: backofficeKeys.scribes.detail(id),
    invalidateKeys: [backofficeKeys.scribes.detail(id), backofficeKeys.scribes.all()],
    fetchFn: getScribe,
    toForm: (s) => ({ name: s.name, scriptorium: s.scriptorium }),
    saveFn: (t, sid, form) => updateScribe(t, sid, form),
    deleteFn: deleteScribe,
    listRoute: '/backoffice/scribes',
    label: 'Scribe',
  });

  // Walk all pages — `getHands(token, { scribe })` returned only the first DRF
  // page (default 20). A productive scribe can have many hands across many
  // manuscripts; the per-scribe listing would hide entries 21+.
  const { data: hands } = useQuery({
    queryKey: backofficeKeys.hands.list({ scribe: id }),
    queryFn: () =>
      walkPaginated<AdminHandListItem>(
        `/api/v1/management/scribes/hands/?scribe=${id}&limit=100`,
        (path) => authFetch(path, token!)
      ),
    enabled: !!token,
  });

  if (editor.isError) {
    return (
      <BackofficeErrorState
        message={t('scribesDetail.failedLoad')}
        onRetry={() => editor.refetch()}
      />
    );
  }
  if (editor.isLoading || !editor.entity || !editor.form) {
    return <BackofficeLoadingState />;
  }

  const scribe = editor.entity;
  const { form, setForm } = editor;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Link href="/backoffice/scribes" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold">{scribe.name}</h1>
          {scribe.period_display && <Badge variant="secondary">{scribe.period_display}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <EntityEditorActions
            dirty={editor.dirty}
            isSaving={editor.isSaving}
            onSave={editor.save}
            onDelete={() => setDeleteOpen(true)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t('scribesDetail.labelName')}</Label>
          <Input value={form.name} onChange={(e) => setForm({ name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>{t('scribesDetail.labelScriptorium')}</Label>
          <Input
            value={form.scriptorium}
            onChange={(e) => setForm({ scriptorium: e.target.value })}
          />
        </div>
      </div>

      {/* Quick links */}
      <div className="flex items-center gap-2">
        <Link href={`/scribes/${id}`} target="_blank">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <ExternalLink className="h-3 w-3" />
            {t('scribesDetail.viewPublicProfile')}
          </Button>
        </Link>
      </div>

      {/* Hands list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {t('scribesDetail.handsSection', { count: hands?.length ?? 0 })}
          </h3>
        </div>
        {hands?.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
            {t('scribesDetail.noHands')}
          </div>
        ) : (
          <div className="rounded-md border divide-y">
            {hands?.map((hand) => (
              <Link
                key={hand.id}
                href={`/backoffice/hands/${hand.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors group"
              >
                <PenTool className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{hand.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{hand.item_part_display}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {hand.date_display && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {hand.date_display}
                      </span>
                    )}
                    {hand.place && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {hand.place}
                      </span>
                    )}
                    {hand.item_part_images?.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {hand.item_part_images.length} image
                        {hand.item_part_images.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                {hand.script_name && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {hand.script_name}
                  </Badge>
                )}
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('scribesDetail.deleteTitle', { name: scribe.name })}
        description={t('scribesDetail.deleteDescription')}
        confirmLabel={t('scribesDetail.deleteConfirm')}
        loading={editor.isDeleting}
        onConfirm={editor.remove}
      />
    </div>
  );
}
