'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ResultType } from '@/lib/search-types';
import {
  mergedFieldOptions,
  isNumericField,
  SEARCHABLE_FIELDS_BY_TYPE,
} from '@/lib/query-builder-fields';
import {
  createEmptyQueryGroup,
  type ConditionOperator,
  type QueryCondition,
  type QueryGroup,
} from '@/lib/search-query';

function newConditionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `c_${Math.random().toString(36).slice(2)}`;
}

function createDefaultQueryCondition(): QueryCondition {
  return { id: newConditionId(), t: 'cond', field: '', op: 'is', value: '', valueTo: '' };
}

const STRING_OPS: { value: ConditionOperator; labelKey: string }[] = [
  { value: 'is', labelKey: 'queryBuilder.opIs' },
  { value: 'is_not', labelKey: 'queryBuilder.opIsNot' },
  { value: 'contains', labelKey: 'queryBuilder.opContains' },
  { value: 'starts_with', labelKey: 'queryBuilder.opStartsWith' },
  { value: 'is_empty', labelKey: 'queryBuilder.opIsEmpty' },
  { value: 'is_not_empty', labelKey: 'queryBuilder.opIsNotEmpty' },
];

const NUMERIC_OPS: { value: ConditionOperator; labelKey: string }[] = [
  { value: 'is', labelKey: 'queryBuilder.opEquals' },
  { value: 'is_not', labelKey: 'queryBuilder.opNotEquals' },
  { value: 'gt', labelKey: 'queryBuilder.opMin' },
  { value: 'lt', labelKey: 'queryBuilder.opMax' },
  { value: 'between', labelKey: 'queryBuilder.opBetween' },
  { value: 'is_empty', labelKey: 'queryBuilder.opIsEmpty' },
  { value: 'is_not_empty', labelKey: 'queryBuilder.opIsNotEmpty' },
];

function operatorsForField(
  resultType: ResultType,
  field: string
): { value: ConditionOperator; labelKey: string }[] {
  if (!field) return STRING_OPS;
  const searchable = new Set(SEARCHABLE_FIELDS_BY_TYPE[resultType] ?? []);
  if (isNumericField(resultType, field)) return NUMERIC_OPS;
  if (!searchable.has(field)) {
    return STRING_OPS.filter((o) => !['contains', 'starts_with'].includes(o.value));
  }
  return STRING_OPS;
}

function needsValue(op: ConditionOperator): boolean {
  return !['is_empty', 'is_not_empty'].includes(op);
}

function needsSecondValue(op: ConditionOperator): boolean {
  return op === 'between';
}

type ConditionRowProps = {
  resultType: ResultType;
  condition: QueryCondition;
  onChange: (next: QueryCondition) => void;
  onRemove: () => void;
  facetHints?: string[];
};

const ConditionRow = React.memo(function ConditionRow({
  resultType,
  condition,
  onChange,
  onRemove,
  facetHints,
}: ConditionRowProps) {
  const t = useTranslations('search');
  const fields = React.useMemo(() => mergedFieldOptions(resultType), [resultType]);
  const ops = React.useMemo(
    () => operatorsForField(resultType, condition.field),
    [resultType, condition.field]
  );
  const opList = React.useMemo(
    () =>
      ops.some((o) => o.value === condition.op)
        ? ops
        : [...ops, { value: condition.op, labelKey: '' }],
    [ops, condition.op]
  );

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-2">
      <div className="grid min-w-[140px] flex-1 gap-1">
        <Label className="text-[10px] uppercase text-muted-foreground">
          {t('queryBuilder.fieldLabel')}
        </Label>
        <Select
          value={condition.field || '__none'}
          onValueChange={(v) =>
            onChange({
              ...condition,
              field: v === '__none' ? '' : v,
              op: 'is',
              value: '',
              valueTo: '',
            })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={t('queryBuilder.fieldPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">{t('queryBuilder.selectFieldOption')}</SelectItem>
            {fields.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid min-w-[120px] gap-1">
        <Label className="text-[10px] uppercase text-muted-foreground">
          {t('queryBuilder.operatorLabel')}
        </Label>
        <Select
          value={condition.op}
          onValueChange={(v) =>
            onChange({
              ...condition,
              op: v as ConditionOperator,
              value: needsValue(v as ConditionOperator) ? condition.value : '',
              valueTo: needsSecondValue(v as ConditionOperator) ? condition.valueTo : '',
            })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {opList.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.labelKey ? t(o.labelKey) : o.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {needsValue(condition.op) && (
        <div className="grid min-w-[100px] flex-1 gap-1">
          <Label className="text-[10px] uppercase text-muted-foreground">
            {t('queryBuilder.valueLabel')}
          </Label>
          {facetHints && facetHints.length > 0 && condition.op === 'is' ? (
            <Select
              value={condition.value || '__free'}
              onValueChange={(v) => onChange({ ...condition, value: v === '__free' ? '' : v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t('queryBuilder.valuePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__free">{t('queryBuilder.typeValueOption')}</SelectItem>
                {facetHints.slice(0, 40).map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              className="h-8 text-xs"
              value={condition.value}
              onChange={(e) => onChange({ ...condition, value: e.currentTarget.value })}
              placeholder={t('queryBuilder.valuePlaceholder')}
            />
          )}
        </div>
      )}
      {needsSecondValue(condition.op) && (
        <div className="grid min-w-[80px] flex-1 gap-1">
          <Label className="text-[10px] uppercase text-muted-foreground">
            {t('queryBuilder.toLabel')}
          </Label>
          <Input
            className="h-8 text-xs"
            value={condition.valueTo ?? ''}
            onChange={(e) => onChange({ ...condition, valueTo: e.currentTarget.value })}
            placeholder={t('queryBuilder.maxPlaceholder')}
          />
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        aria-label={t('queryBuilder.removeCondition')}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
});

/** Replace the group at `path` with `replacement` (path [] = root). */
function replaceGroupAtPath(root: QueryGroup, path: number[], replacement: QueryGroup): QueryGroup {
  if (path.length === 0) return replacement;
  const [head, ...rest] = path;
  const child = root.items[head];
  if (!child || child.t !== 'group') return root;
  const nextItems = [...root.items];
  nextItems[head] = replaceGroupAtPath(child, rest, replacement);
  return { ...root, items: nextItems };
}

type GroupBlockProps = {
  resultType: ResultType;
  group: QueryGroup;
  path: number[];
  onChangeRoot: (next: QueryGroup) => void;
  root: QueryGroup;
  facetDistribution?: Record<string, Record<string, number>>;
};

function GroupBlock({
  resultType,
  group,
  path,
  onChangeRoot,
  root,
  facetDistribution,
}: GroupBlockProps) {
  const t = useTranslations('search');
  const setThisGroup = (next: QueryGroup) => {
    onChangeRoot(replaceGroupAtPath(root, path, next));
  };

  const hintsForField = (field: string): string[] | undefined => {
    const dist = facetDistribution?.[field];
    if (!dist) return undefined;
    return Object.keys(dist).sort((a, b) => a.localeCompare(b));
  };

  return (
    <div
      className={
        path.length > 0
          ? 'space-y-2 rounded-lg border border-dashed p-3 bg-background/50'
          : 'space-y-2'
      }
    >
      {path.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">
            {t('queryBuilder.groupLabel')}
          </span>
          <div className="flex rounded-md border p-0.5">
            <button
              type="button"
              className={`rounded px-2 py-0.5 text-xs ${group.op === 'AND' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setThisGroup({ ...group, op: 'AND' })}
            >
              {t('queryBuilder.opAnd')}
            </button>
            <button
              type="button"
              className={`rounded px-2 py-0.5 text-xs ${group.op === 'OR' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setThisGroup({ ...group, op: 'OR' })}
            >
              {t('queryBuilder.opOr')}
            </button>
          </div>
        </div>
      )}
      {path.length === 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">
            {t('queryBuilder.matchLabel')}
          </span>
          <div className="flex rounded-md border p-0.5">
            <button
              type="button"
              className={`rounded px-2 py-0.5 text-xs ${group.op === 'AND' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setThisGroup({ ...group, op: 'AND' })}
            >
              {t('queryBuilder.matchAllAnd')}
            </button>
            <button
              type="button"
              className={`rounded px-2 py-0.5 text-xs ${group.op === 'OR' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setThisGroup({ ...group, op: 'OR' })}
            >
              {t('queryBuilder.matchAnyOr')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {group.items.map((node, index) => {
          const childPath = [...path, index];
          if (node.t === 'group') {
            return (
              <div key={node.id} className="relative">
                <GroupBlock
                  resultType={resultType}
                  group={node}
                  path={childPath}
                  onChangeRoot={onChangeRoot}
                  root={root}
                  facetDistribution={facetDistribution}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 text-xs text-destructive"
                  onClick={() => {
                    const nextItems = group.items.filter((_, i) => i !== index);
                    setThisGroup({ ...group, items: nextItems });
                  }}
                >
                  {t('queryBuilder.removeGroup')}
                </Button>
              </div>
            );
          }
          return (
            <ConditionRow
              key={node.id}
              resultType={resultType}
              condition={node}
              facetHints={hintsForField(node.field)}
              onChange={(next) => {
                const nextItems = [...group.items];
                nextItems[index] = next;
                setThisGroup({ ...group, items: nextItems });
              }}
              onRemove={() => {
                const nextItems = group.items.filter((_, i) => i !== index);
                setThisGroup({ ...group, items: nextItems });
              }}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => {
            const cond = createDefaultQueryCondition();
            setThisGroup({ ...group, items: [...group.items, cond] });
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          {t('queryBuilder.addCondition')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => {
            const nested = createEmptyQueryGroup('AND');
            nested.items.push(createDefaultQueryCondition());
            setThisGroup({ ...group, items: [...group.items, nested] });
          }}
        >
          <Layers className="h-3.5 w-3.5" />
          {t('queryBuilder.addGroup')}
        </Button>
      </div>
    </div>
  );
}

export type QueryBuilderPanelProps = {
  resultType: ResultType;
  queryRoot: QueryGroup;
  onQueryRootChange: (next: QueryGroup) => void;
  facetDistribution?: Record<string, Record<string, number>>;
};

export function QueryBuilderPanel({
  resultType,
  queryRoot,
  onQueryRootChange,
  facetDistribution,
}: QueryBuilderPanelProps) {
  return (
    <GroupBlock
      resultType={resultType}
      group={queryRoot}
      path={[]}
      onChangeRoot={onQueryRootChange}
      root={queryRoot}
      facetDistribution={facetDistribution}
    />
  );
}
