'use client'

import { useState, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { SEARCH_RESULT_TYPES, type ResultType } from '@/lib/search-types'
import { FILTER_ORDER_MAP } from '@/lib/filter-order'
import { formatFacetTitle } from '@/lib/search-query'
import { DEFAULT_COLUMNS, type SearchCategoryConfig } from '@/lib/site-features'
import { SortableCheckboxList, type SortableItem } from './sortable-checkbox-list'

const CATEGORY_LABELS: Record<ResultType, string> = {
  manuscripts: 'Manuscripts',
  images: 'Images',
  scribes: 'Scribes',
  hands: 'Hands',
  graphs: 'Graphs',
  texts: 'Texts',
  clauses: 'Clauses',
  people: 'People',
  places: 'Places',
}

type Props = {
  categories: Record<ResultType, SearchCategoryConfig>
  onChange: (type: ResultType, config: SearchCategoryConfig) => void
}

function useColumnItems(type: ResultType): SortableItem[] {
  return useMemo(
    () => DEFAULT_COLUMNS[type].map((col) => ({ id: col, label: col })),
    [type],
  )
}

function useFacetItems(type: ResultType): SortableItem[] {
  return useMemo(() => {
    const facets = FILTER_ORDER_MAP[type] ?? []
    return facets.map((f) => ({ id: f, label: formatFacetTitle(f, type) }))
  }, [type])
}

export function SearchCategoryConfigPanel({ categories, onChange }: Props) {
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Search Categories</CardTitle>
        <CardDescription>
          Toggle categories and configure visible columns and facets. Drag to reorder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {SEARCH_RESULT_TYPES.map((type) => {
            const config = categories[type]
            const isOpen = openCategory === type

            return (
              <Collapsible
                key={type}
                open={isOpen}
                onOpenChange={(open) => setOpenCategory(open ? type : null)}
              >
                <div className="rounded-lg border">
                  <div className="flex items-center justify-between px-3 py-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex items-center gap-2 p-0 h-auto hover:bg-transparent">
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                        />
                        <span className="text-sm font-medium">{CATEGORY_LABELS[type]}</span>
                        {!isOpen && (
                          <span className="text-xs text-muted-foreground ml-1">
                            {config.visibleColumns.length} col · {config.visibleFacets.length} facets
                          </span>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(checked) =>
                        onChange(type, { ...config, enabled: checked })
                      }
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
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function CategoryColumns({
  type,
  config,
  onChange,
}: {
  type: ResultType
  config: SearchCategoryConfig
  onChange: (type: ResultType, config: SearchCategoryConfig) => void
}) {
  const columnItems = useColumnItems(type)
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
        Columns
      </h4>
      <SortableCheckboxList
        allItems={columnItems}
        checkedIds={config.visibleColumns}
        onChangeOrder={(reordered) =>
          onChange(type, { ...config, visibleColumns: reordered })
        }
      />
    </div>
  )
}

function CategoryFacets({
  type,
  config,
  onChange,
}: {
  type: ResultType
  config: SearchCategoryConfig
  onChange: (type: ResultType, config: SearchCategoryConfig) => void
}) {
  const facetItems = useFacetItems(type)
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
        Facets
      </h4>
      <SortableCheckboxList
        allItems={facetItems}
        checkedIds={config.visibleFacets}
        onChangeOrder={(reordered) =>
          onChange(type, { ...config, visibleFacets: reordered })
        }
      />
    </div>
  )
}
