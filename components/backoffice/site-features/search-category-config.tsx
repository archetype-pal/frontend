'use client';

import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getFacetOrder, SEARCH_RESULT_TYPES, type ResultType } from '@/lib/search-types';
import { resolveResultTypeLabel } from '@/lib/search-label-helpers';
import { formatFacetTitle } from '@/lib/search-query';
import { getEnabledSearchCategories, type SearchCategoryConfig } from '@/lib/site-features';
import { COLUMN_HEADERS_BY_TYPE } from '@/components/search/results-table';
import { SortableCheckboxList, type SortableItem } from './sortable-checkbox-list';
import { useModelLabels } from '@/contexts/model-labels-context';

type Props = {
  categories: Record<ResultType, SearchCategoryConfig>;
  onChange: (type: ResultType, config: SearchCategoryConfig) => void;
};

function useColumnItems(type: ResultType): SortableItem[] {
  return useMemo(
    () => COLUMN_HEADERS_BY_TYPE[type].map((col) => ({ id: col, label: col })),
    [type]
  );
}

function useFacetItems(type: ResultType): SortableItem[] {
  return useMemo(() => {
    const facets = getFacetOrder(type);
    return facets.map((f) => ({ id: f, label: formatFacetTitle(f, type) }));
  }, [type]);
}

export function SearchCategoryConfigPanel({ categories, onChange }: Props) {
  const t = useTranslations('backoffice');
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const { getLabel } = useModelLabels();
  const categoryLabels: Record<ResultType, string> = useMemo(
    () =>
      Object.fromEntries(
        SEARCH_RESULT_TYPES.map((type) => [type, resolveResultTypeLabel(type, getLabel)])
      ) as Record<ResultType, string>,
    [getLabel]
  );
  const enabledCategoryCount = useMemo(
    () => getEnabledSearchCategories({ searchCategories: categories }).length,
    [categories]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{t('siteFeatures.searchCategoriesTitle')}</CardTitle>
        <CardDescription>{t('siteFeatures.searchCategoriesDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {SEARCH_RESULT_TYPES.map((type) => {
            const config = categories[type];
            const isOpen = openCategory === type;
            const cannotDisable = config.enabled && enabledCategoryCount <= 1;

            return (
              <Collapsible
                key={type}
                open={isOpen}
                onOpenChange={(open) => setOpenCategory(open ? type : null)}
              >
                <div className="rounded-lg border">
                  <div className="flex items-center justify-between px-3 py-2">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 p-0 h-auto hover:bg-transparent"
                      >
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                        />
                        <span className="text-sm font-medium">{categoryLabels[type]}</span>
                        {!isOpen && (
                          <span className="text-xs text-muted-foreground ml-1">
                            {t('siteFeatures.categorySummary', {
                              columns: config.visibleColumns.length,
                              facets: config.visibleFacets.length,
                            })}
                          </span>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <Switch
                      aria-label={categoryLabels[type]}
                      checked={config.enabled}
                      disabled={cannotDisable}
                      title={cannotDisable ? t('siteFeatures.searchCategoriesRequired') : undefined}
                      onCheckedChange={(checked) => onChange(type, { ...config, enabled: checked })}
                    />
                  </div>

                  <CollapsibleContent>
                    <div className="border-t px-3 py-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CategoryColumns type={type} config={config} onChange={onChange} />
                        <CategoryFacets type={type} config={config} onChange={onChange} />
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryColumns({
  type,
  config,
  onChange,
}: {
  type: ResultType;
  config: SearchCategoryConfig;
  onChange: (type: ResultType, config: SearchCategoryConfig) => void;
}) {
  const t = useTranslations('backoffice');
  const columnItems = useColumnItems(type);
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
        {t('siteFeatures.columnsHeading')}
      </h4>
      <SortableCheckboxList
        allItems={columnItems}
        checkedIds={config.visibleColumns}
        onChangeOrder={(reordered) => onChange(type, { ...config, visibleColumns: reordered })}
      />
    </div>
  );
}

function CategoryFacets({
  type,
  config,
  onChange,
}: {
  type: ResultType;
  config: SearchCategoryConfig;
  onChange: (type: ResultType, config: SearchCategoryConfig) => void;
}) {
  const t = useTranslations('backoffice');
  const facetItems = useFacetItems(type);
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
        {t('siteFeatures.facetsHeading')}
      </h4>
      <SortableCheckboxList
        allItems={facetItems}
        checkedIds={config.visibleFacets}
        onChangeOrder={(reordered) => onChange(type, { ...config, visibleFacets: reordered })}
      />
    </div>
  );
}
