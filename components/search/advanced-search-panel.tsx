'use client';

import * as React from 'react';
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

export type AdvancedSearchState = {
  enabled: boolean;
  searchField: string;
  matchingStrategy: 'all' | 'last';
  notFacetKey: string;
  notFacetValue: string;
  rangeField: string;
  rangeMin: string;
  rangeMax: string;
};

type AdvancedSearchPanelProps = {
  resultType: ResultType;
  value: AdvancedSearchState;
  onChange: (next: AdvancedSearchState) => void;
};

const SEARCHABLE_FIELDS: Record<ResultType, string[]> = {
  manuscripts: [
    'display_label',
    'repository_name',
    'repository_city',
    'shelfmark',
    'catalogue_numbers',
    'type',
  ],
  images: ['locus', 'repository_name', 'shelfmark', 'components', 'features'],
  scribes: ['name', 'scriptorium'],
  hands: ['name', 'place', 'description', 'repository_name', 'shelfmark'],
  graphs: [
    'display_label',
    'repository_name',
    'shelfmark',
    'allograph',
    'character',
    'hand_name',
    'components',
  ],
  texts: [
    'content',
    'repository_name',
    'shelfmark',
    'catalogue_numbers',
    'text_type',
    'places',
    'people',
  ],
  clauses: ['content', 'clause_type', 'repository_name', 'shelfmark'],
  people: ['name', 'person_type', 'ref', 'repository_name', 'shelfmark'],
  places: ['name', 'place_type', 'ref', 'repository_name', 'shelfmark'],
};

const RANGE_FIELDS: Partial<Record<ResultType, string[]>> = {
  manuscripts: ['number_of_images'],
  images: ['number_of_annotations'],
};

export const DEFAULT_ADVANCED_SEARCH_STATE: AdvancedSearchState = {
  enabled: false,
  searchField: '',
  matchingStrategy: 'all',
  notFacetKey: '',
  notFacetValue: '',
  rangeField: '',
  rangeMin: '',
  rangeMax: '',
};

export function AdvancedSearchPanel({ resultType, value, onChange }: AdvancedSearchPanelProps) {
  const searchableFields = SEARCHABLE_FIELDS[resultType] ?? [];
  const rangeFields = RANGE_FIELDS[resultType] ?? [];
  const update = (patch: Partial<AdvancedSearchState>) => onChange({ ...value, ...patch });

  if (!value.enabled) {
    return null;
  }

  return (
    <section className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Advanced search</h3>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              On
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Narrow search behavior with field targeting, matching strategy, exclusions, and numeric
            ranges.
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
          <Label className="text-xs">Search Field</Label>
          <Select
            value={value.searchField || '__all'}
            onValueChange={(v) => update({ searchField: v === '__all' ? '' : v })}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="All searchable fields" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All searchable fields</SelectItem>
              {searchableFields.map((field) => (
                <SelectItem key={field} value={field}>
                  {field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Restrict keyword matching to one field, or search all indexed fields.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Matching Strategy</Label>
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
            Choose strict matching (`all`) or broader matching (`any`).
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Exclude Facet Key</Label>
          <Input
            value={value.notFacetKey}
            onChange={(e) => update({ notFacetKey: e.currentTarget.value })}
            placeholder="repository_name"
            className="h-8"
          />
          <p className="text-[11px] text-muted-foreground">Example: `repository_name`.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Exclude Facet Value</Label>
          <Input
            value={value.notFacetValue}
            onChange={(e) => update({ notFacetValue: e.currentTarget.value })}
            placeholder="Durham Cathedral Library"
            className="h-8"
          />
          <p className="text-[11px] text-muted-foreground">
            Records matching this value are excluded from results.
          </p>
        </div>
        {rangeFields.length > 0 && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Numeric Range Field</Label>
              <Select
                value={value.rangeField || '__none'}
                onValueChange={(v) => update({ rangeField: v === '__none' ? '' : v })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {rangeFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Apply numeric min/max only when supported for this result type.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Min</Label>
                <Input
                  value={value.rangeMin}
                  onChange={(e) => update({ rangeMin: e.currentTarget.value })}
                  placeholder="0"
                  className="h-8"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max</Label>
                <Input
                  value={value.rangeMax}
                  onChange={(e) => update({ rangeMax: e.currentTarget.value })}
                  placeholder="100"
                  className="h-8"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
