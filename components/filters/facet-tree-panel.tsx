'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { FacetListItem } from '@/types/facets';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

type FacetTreePanelProps = {
  id: string;
  title: string;
  total?: number;
  items: FacetListItem[];
  selectedValues: string[];
  onSelect: (value: string, isDeselect: boolean) => void;
};

type FacetTreeNode = {
  component: string;
  total: number;
  children: FacetListItem[];
};

function buildTree(items: FacetListItem[]): FacetTreeNode[] {
  const map = new Map<string, FacetTreeNode>();
  for (const item of items) {
    const [rawComponent, ...featureParts] = item.label.split(' - ');
    const component = (rawComponent || 'Other').trim();
    const feature = featureParts.join(' - ').trim() || item.label;
    const normalized: FacetListItem = { ...item, label: feature };
    const node = map.get(component);
    if (node) {
      node.children.push(normalized);
      node.total += item.count;
    } else {
      map.set(component, { component, total: item.count, children: [normalized] });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function FacetTreePanel({
  id,
  title,
  total,
  items,
  selectedValues,
  onSelect,
}: FacetTreePanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [expandedNodes, setExpandedNodes] = React.useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = React.useState('');
  const tree = React.useMemo(() => buildTree(items), [items]);
  const filteredTree = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return tree;
    return tree
      .map((node) => {
        const componentMatches = node.component.toLowerCase().includes(query);
        if (componentMatches) return node;
        const children = node.children.filter((child) => child.label.toLowerCase().includes(query));
        if (children.length === 0) return null;
        return {
          ...node,
          children,
          total: children.reduce((sum, child) => sum + child.count, 0),
        };
      })
      .filter((node): node is FacetTreeNode => node != null);
  }, [tree, searchTerm]);
  const selectedCount = selectedValues.length;
  const maxCount = React.useMemo(() => {
    let max = 0;
    for (const node of filteredTree) {
      for (const child of node.children) {
        max = Math.max(max, child.count);
      }
    }
    return max;
  }, [filteredTree]);
  const showSparklines = filteredTree.length >= 1 && maxCount > 0;

  return (
    <div className="border bg-white rounded-lg shadow-sm" id={`panel-${id}`}>
      <div className="border-b px-4 py-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold leading-tight">
          {title}
          {total !== undefined && <span className="ml-1 text-muted-foreground">({total})</span>}
          {selectedCount > 0 && (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
              {selectedCount} selected
            </span>
          )}
        </h4>
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
      {isExpanded && (
        <div className="max-h-72 overflow-y-auto px-2 py-2 space-y-2">
          <p className="px-1 text-[11px] text-muted-foreground">
            Select one or more feature combinations. Matching records must include all selected
            features.
          </p>
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.currentTarget.value)}
            placeholder="Filter components or features..."
            className="h-8"
            aria-label={`Search ${title} tree`}
          />
          {filteredTree.length === 0 && (
            <p className="px-1 py-2 text-xs text-muted-foreground">
              No component-feature values match your search.
            </p>
          )}
          {filteredTree.map((node) => {
            const nodeExpanded = expandedNodes[node.component] ?? true;
            return (
              <div key={node.component} className="rounded border border-muted">
                <button
                  type="button"
                  aria-expanded={nodeExpanded}
                  className="w-full px-2 py-1 text-left text-xs font-semibold flex items-center justify-between"
                  onClick={() =>
                    setExpandedNodes((prev) => ({ ...prev, [node.component]: !nodeExpanded }))
                  }
                >
                  <span className="truncate">{node.component}</span>
                  <span className="text-muted-foreground">{node.total}</span>
                </button>
                {nodeExpanded && (
                  <ul className="pb-1">
                    {node.children.map((child) => {
                      const isSelected = selectedValues.includes(child.value);
                      return (
                        <li key={child.value}>
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            className={cn(
                              'w-full px-3 py-1 text-left text-xs flex items-center justify-between hover:bg-muted',
                              isSelected && 'bg-muted font-semibold'
                            )}
                            onClick={() => onSelect(child.value, isSelected)}
                          >
                            <span className="truncate">{child.label}</span>
                            <span className="inline-flex items-center gap-2">
                              <span className="text-muted-foreground">{child.count}</span>
                              {showSparklines && (
                                <span className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                                  <span
                                    className="block h-full bg-primary/60"
                                    style={{
                                      width: `${Math.max(5, Math.round((child.count / maxCount) * 100))}%`,
                                    }}
                                  />
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
