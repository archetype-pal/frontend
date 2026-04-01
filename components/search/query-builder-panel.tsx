'use client';

import * as React from 'react';
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

const STRING_OPS: { value: ConditionOperator; label: string }[] = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'contains', label: 'contains (full-text)' },
  { value: 'starts_with', label: 'starts with (full-text)' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const NUMERIC_OPS: { value: ConditionOperator; label: string }[] = [
  { value: 'is', label: 'equals' },
  { value: 'is_not', label: 'not equals' },
  { value: 'gt', label: '≥ (min)' },
  { value: 'lt', label: '≤ (max)' },
  { value: 'between', label: 'between' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

function operatorsForField(
  resultType: ResultType,
  field: string
): { value: ConditionOperator; label: string }[] {
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

function ConditionRow({
  resultType,
  condition,
  onChange,
  onRemove,
  facetHints,
}: ConditionRowProps) {
  const fields = mergedFieldOptions(resultType);
  const ops = operatorsForField(resultType, condition.field);
  const opList = ops.some((o) => o.value === condition.op)
    ? ops
    : [...ops, { value: condition.op, label: condition.op }];

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-2">
      <div className="grid min-w-[140px] flex-1 gap-1">
        <Label className="text-[10px] uppercase text-muted-foreground">Field</Label>
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
            <SelectValue placeholder="Field" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Select field…</SelectItem>
            {fields.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid min-w-[120px] gap-1">
        <Label className="text-[10px] uppercase text-muted-foreground">Operator</Label>
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
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {needsValue(condition.op) && (
        <div className="grid min-w-[100px] flex-1 gap-1">
          <Label className="text-[10px] uppercase text-muted-foreground">Value</Label>
          {facetHints && facetHints.length > 0 && condition.op === 'is' ? (
            <Select
              value={condition.value || '__free'}
              onValueChange={(v) => onChange({ ...condition, value: v === '__free' ? '' : v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Value" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__free">Type value…</SelectItem>
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
              placeholder="Value"
            />
          )}
        </div>
      )}
      {needsSecondValue(condition.op) && (
        <div className="grid min-w-[80px] flex-1 gap-1">
          <Label className="text-[10px] uppercase text-muted-foreground">To</Label>
          <Input
            className="h-8 text-xs"
            value={condition.valueTo ?? ''}
            onChange={(e) => onChange({ ...condition, valueTo: e.currentTarget.value })}
            placeholder="Max"
          />
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        aria-label="Remove condition"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

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
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Group</span>
          <div className="flex rounded-md border p-0.5">
            <button
              type="button"
              className={`rounded px-2 py-0.5 text-xs ${group.op === 'AND' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setThisGroup({ ...group, op: 'AND' })}
            >
              AND
            </button>
            <button
              type="button"
              className={`rounded px-2 py-0.5 text-xs ${group.op === 'OR' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setThisGroup({ ...group, op: 'OR' })}
            >
              OR
            </button>
          </div>
        </div>
      )}
      {path.length === 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Match</span>
          <div className="flex rounded-md border p-0.5">
            <button
              type="button"
              className={`rounded px-2 py-0.5 text-xs ${group.op === 'AND' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setThisGroup({ ...group, op: 'AND' })}
            >
              All (AND)
            </button>
            <button
              type="button"
              className={`rounded px-2 py-0.5 text-xs ${group.op === 'OR' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setThisGroup({ ...group, op: 'OR' })}
            >
              Any (OR)
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
                  Remove group
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
          Add condition
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
          Add group
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
