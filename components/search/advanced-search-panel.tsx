'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ResultType } from '@/lib/search-types';
import { SEARCHABLE_FIELDS_BY_TYPE } from '@/lib/query-builder-fields';
import { QueryBuilderPanel } from '@/components/search/query-builder-panel';
import { createEmptyQueryGroup, type QueryGroup } from '@/lib/search-query';

export type AdvancedSearchState = {
  enabled: boolean;
  searchField: string;
  matchingStrategy: 'all' | 'last';
  queryRoot: QueryGroup;
};

type AdvancedSearchPanelProps = {
  resultType: ResultType;
  value: AdvancedSearchState;
  onChange: (next: AdvancedSearchState) => void;
  facetDistribution?: Record<string, Record<string, number>>;
};

export const DEFAULT_ADVANCED_SEARCH_STATE: AdvancedSearchState = {
  enabled: false,
  searchField: '',
  matchingStrategy: 'all',
  queryRoot: createEmptyQueryGroup('AND'),
};

export function AdvancedSearchPanel({
  resultType,
  value,
  onChange,
  facetDistribution,
}: AdvancedSearchPanelProps) {
  const update = (patch: Partial<AdvancedSearchState>) => onChange({ ...value, ...patch });

  if (!value.enabled) {
    return null;
  }

  return (
    <section className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Advanced search</h3>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              On
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Build filters with AND/OR groups, field operators, and keyword matching options.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                ...DEFAULT_ADVANCED_SEARCH_STATE,
                enabled: true,
                matchingStrategy: value.matchingStrategy,
              })
            }
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => update({ enabled: false })}
            aria-pressed={value.enabled}
          >
            Turn off
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Keyword search fields</Label>
          <Select
            value={value.searchField || '__all'}
            onValueChange={(v) => update({ searchField: v === '__all' ? '' : v })}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="All searchable fields" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All searchable fields</SelectItem>
              {SEARCHABLE_FIELDS_BY_TYPE[resultType]?.map((field) => (
                <SelectItem key={field} value={field}>
                  {field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Restrict the main keyword box to one field, or search all indexed fields.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Matching strategy</Label>
          <Select
            value={value.matchingStrategy}
            onValueChange={(v) => update({ matchingStrategy: v as 'all' | 'last' })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All words must match</SelectItem>
              <SelectItem value="last">Any word can match</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Strict matching (`all`) or broader matching (`any`).
          </p>
        </div>
      </div>

      <div className="border-t pt-3">
        <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
          Query builder
        </h4>
        <QueryBuilderPanel
          resultType={resultType}
          queryRoot={value.queryRoot}
          onQueryRootChange={(queryRoot) => update({ queryRoot })}
          facetDistribution={facetDistribution}
        />
      </div>
    </section>
  );
}
