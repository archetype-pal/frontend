'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { Save, Plus, Loader2, Trash2, Grid3X3, LayoutList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AllographTabPanel } from './allograph-tab-panel';
import { ComparisonMatrix } from './comparison-matrix';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import {
  getCharacter,
  updateCharacterStructure,
  deleteCharacter,
} from '@/services/backoffice/symbols';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { useUnsavedGuard } from '@/hooks/backoffice/use-unsaved-guard';
import { useKeyboardShortcut } from '@/hooks/backoffice/use-keyboard-shortcut';
import {
  CHARACTER_TYPES,
  type CharacterDetail as CharacterDetailType,
  type CharacterStructurePayload,
  type AllographNested,
  type Component,
  type Feature,
} from '@/types/backoffice';

interface CharacterDetailProps {
  characterId: number;
  allComponents: Component[];
  allFeatures: Feature[];
  onDeleted: () => void;
}

type ViewMode = 'tabs' | 'matrix';

const CHARACTER_TYPE_KEYS: Record<string, string> = {
  'Majuscule Letter': 'symbols.characterTypeMajusculeLetter',
  'Minuscule Letter': 'symbols.characterTypeMinusculeLetter',
  Numeral: 'symbols.characterTypeNumeral',
  Punctuation: 'symbols.characterTypePunctuation',
  Symbol: 'symbols.characterTypeSymbol',
  Accent: 'symbols.characterTypeAccent',
};

export function CharacterDetail({
  characterId,
  allComponents,
  allFeatures,
  onDeleted,
}: CharacterDetailProps) {
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const characterTypeLabel = (type: string) => {
    const key = CHARACTER_TYPE_KEYS[type];
    return key ? t(key) : type;
  };

  const { data: character, isLoading } = useQuery({
    queryKey: backofficeKeys.characters.detail(characterId),
    queryFn: () => getCharacter(token!, characterId),
    enabled: !!token,
  });

  // Local draft state for editing
  const [draft, setDraft] = useState<CharacterDetailType | null>(null);
  const [dirty, setDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('tabs');
  const [activeAlloTab, setActiveAlloTab] = useState<string>('0');
  const [addingAllograph, setAddingAllograph] = useState(false);
  const [newAlloName, setNewAlloName] = useState('');

  // Warn before leaving with unsaved changes
  useUnsavedGuard(dirty);

  // Sync draft with fetched data
  useEffect(() => {
    if (character) {
      setDraft(character); // eslint-disable-line react-hooks/set-state-in-effect
      setDirty(false);
    }
  }, [character]);

  const updateDraft = useCallback((updater: (prev: CharacterDetailType) => CharacterDetailType) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      setDirty(true);
      return next;
    });
  }, []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (payload: CharacterStructurePayload) =>
      updateCharacterStructure(token!, characterId, payload),
    onSuccess: (data) => {
      toast.success(t('symbols.toastCharacterSaved'));
      queryClient.setQueryData(backofficeKeys.characters.detail(characterId), data);
      queryClient.invalidateQueries({ queryKey: backofficeKeys.characters.all() });
      setDirty(false);
    },
    onError: (err) => {
      toast.error(t('symbols.toastFailedSave'), {
        description: formatApiError(err),
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteCharacter(token!, characterId),
    onSuccess: () => {
      toast.success(t('symbols.toastCharacterDeleted'));
      queryClient.invalidateQueries({ queryKey: backofficeKeys.characters.all() });
      onDeleted();
    },
    onError: (err) => {
      toast.error(t('symbols.toastFailedDelete'), {
        description: formatApiError(err),
      });
    },
  });

  const handleSave = () => {
    if (!draft) return;
    const payload: CharacterStructurePayload = {
      name: draft.name,
      type: draft.type,
      allographs: draft.allographs.map((allo) => ({
        ...(allo.id ? { id: allo.id } : {}),
        name: allo.name,
        components: allo.components.map((ac) => ({
          ...(ac.id ? { id: ac.id } : {}),
          component_id: ac.component_id,
          features: ac.features.map((f) => ({
            id: f.id,
            set_by_default: f.set_by_default,
          })),
        })),
      })),
    };
    saveMutation.mutate(payload);
  };

  // Cmd+S to save
  useKeyboardShortcut(
    'mod+s',
    () => {
      if (dirty && !saveMutation.isPending) handleSave();
    },
    dirty
  );

  const handleAddAllograph = (name: string) => {
    updateDraft((prev) => ({
      ...prev,
      allographs: [...prev.allographs, { id: 0, name, components: [] } as AllographNested],
    }));
    // Switch to the new tab
    setActiveAlloTab(String(draft ? draft.allographs.length : 0));
    setAddingAllograph(false);
    setNewAlloName('');
  };

  const handleUpdateAllograph = (index: number, updated: AllographNested) => {
    updateDraft((prev) => ({
      ...prev,
      allographs: prev.allographs.map((a, i) => (i === index ? updated : a)),
    }));
  };

  const handleRemoveAllograph = (index: number) => {
    updateDraft((prev) => ({
      ...prev,
      allographs: prev.allographs.filter((_, i) => i !== index),
    }));
    // Adjust active tab
    if (Number(activeAlloTab) >= index) {
      setActiveAlloTab(String(Math.max(0, Number(activeAlloTab) - 1)));
    }
  };

  // Summary stats
  const stats = useMemo(() => {
    if (!draft) return { allographs: 0, components: 0, features: 0 };
    const totalComponents = draft.allographs.reduce((sum, a) => sum + a.components.length, 0);
    const totalFeatures = draft.allographs.reduce(
      (sum, a) => sum + a.components.reduce((s, c) => s + c.features.length, 0),
      0
    );
    return {
      allographs: draft.allographs.length,
      components: totalComponents,
      features: totalFeatures,
    };
  }, [draft]);

  if (isLoading || !draft) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">
            {t('symbols.characterHeading', { name: draft.name })}
          </h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {draft.type && <Badge variant="secondary">{characterTypeLabel(draft.type)}</Badge>}
            <span>
              {t('symbols.characterStats', {
                allographs: stats.allographs,
                components: stats.components,
                features: stats.features,
              })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {tCommon('delete')}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1" />
            )}
            {tCommon('save')}
          </Button>
        </div>
      </div>

      {/* Basic fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t('symbols.nameLabel')}</Label>
          <Input
            value={draft.name}
            onChange={(e) => updateDraft((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('symbols.typeLabel')}</Label>
          <Select
            value={draft.type || '__none'}
            onValueChange={(val) =>
              updateDraft((prev) => ({
                ...prev,
                type: val === '__none' ? null : val,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{t('symbols.typeNone')}</SelectItem>
              {CHARACTER_TYPES.map((charType) => (
                <SelectItem key={charType} value={charType}>
                  {characterTypeLabel(charType)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Allographs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">{t('symbols.allographsHeading')}</h3>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'tabs' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode('tabs')}
              title={t('symbols.tabView')}
            >
              <LayoutList className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'matrix' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode('matrix')}
              title={t('symbols.matrixView')}
              disabled={draft.allographs.length === 0}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {draft.allographs.length === 0 && !addingAllograph ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p className="text-sm">{t('symbols.noAllographsYet')}</p>
            <Button
              variant="link"
              size="sm"
              className="mt-1"
              onClick={() => setAddingAllograph(true)}
            >
              {t('symbols.addFirstAllograph')}
            </Button>
          </div>
        ) : viewMode === 'matrix' ? (
          <ComparisonMatrix
            allographs={draft.allographs}
            allComponents={allComponents}
            allFeatures={allFeatures}
            disabled={saveMutation.isPending}
            onSelectAllograph={(idx) => {
              setActiveAlloTab(String(idx));
              setViewMode('tabs');
            }}
          />
        ) : (
          <Tabs value={activeAlloTab} onValueChange={setActiveAlloTab}>
            <div className="flex items-center gap-1">
              <TabsList className="h-auto flex-wrap justify-start bg-transparent p-0 gap-1">
                {draft.allographs.map((allo, idx) => (
                  <TabsTrigger
                    key={allo.id || `new-${idx}`}
                    value={String(idx)}
                    className="rounded-md border px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                  >
                    {allo.name}
                    {allo.components.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1.5 text-[9px] px-1 h-3.5 tabular-nums data-[state=active]:bg-primary-foreground/20 data-[state=active]:text-primary-foreground"
                      >
                        {allo.components.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Inline add allograph */}
              {addingAllograph ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={newAlloName}
                    onChange={(e) => setNewAlloName(e.target.value)}
                    placeholder={t('symbols.allographNamePlaceholder')}
                    className="h-8 w-40 text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newAlloName.trim()) {
                        handleAddAllograph(newAlloName.trim());
                      }
                      if (e.key === 'Escape') {
                        setAddingAllograph(false);
                        setNewAlloName('');
                      }
                    }}
                    onBlur={() => {
                      if (!newAlloName.trim()) {
                        setAddingAllograph(false);
                        setNewAlloName('');
                      }
                    }}
                  />
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs text-muted-foreground"
                  onClick={() => setAddingAllograph(true)}
                >
                  <Plus className="h-3 w-3" />
                  {tCommon('add')}
                </Button>
              )}
            </div>

            {draft.allographs.map((allo, idx) => (
              <TabsContent key={allo.id || `new-${idx}`} value={String(idx)} className="mt-3">
                <AllographTabPanel
                  allograph={allo}
                  allComponents={allComponents}
                  allFeatures={allFeatures}
                  onUpdate={(updated) => handleUpdateAllograph(idx, updated)}
                  onRemove={() => handleRemoveAllograph(idx)}
                  disabled={saveMutation.isPending}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      {/* Dirty indicator */}
      {dirty && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t -mx-6 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-amber-600 font-medium">{tCommon('unsavedChanges')}</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              Ctrl+S
            </kbd>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (character) {
                  setDraft(character);
                  setDirty(false);
                }
              }}
            >
              {t('unsavedBar.discard')}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? tCommon('saving') : t('symbols.saveChanges')}
            </Button>
          </div>
        </div>
      )}

      {/* Delete dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('symbols.deleteCharacterTitle', { name: draft.name })}
        description={t('symbols.deleteCharacterDescription')}
        confirmLabel={tCommon('delete')}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
