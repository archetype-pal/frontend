'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
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
    <div
      className="overflow-hidden rounded-lg border border-border/60 bg-card/50"
      id={`panel-${id}`}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40"
      >
        <h4 className="flex items-baseline gap-1.5 font-serif text-[13px] font-semibold leading-tight tracking-tight text-foreground">
          {title}
          {total !== undefined && (
            <span className="text-[11px] font-normal tabular-nums text-muted-foreground/70">
              {total}
            </span>
          )}
          {selectedCount > 0 && (
            <span className="rounded-full border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
              {selectedCount} selected
            </span>
          )}
        </h4>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            isExpanded ? 'rotate-0' : '-rotate-90'
          )}
        />
      </button>
      {isExpanded && (
        <div className="max-h-72 space-y-2 overflow-y-auto border-t border-border/50 px-2 py-2">
          <p className="px-1 text-[11px] text-muted-foreground">
            Select one or more feature combinations. Matching records must include all selected
            features.
          </p>
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.currentTarget.value)}
            placeholder="Filter components or features…"
            className="h-8 bg-background/60 text-[13px]"
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
              <div
                key={node.component}
                className="overflow-hidden rounded-md border border-border/50 bg-background/40"
              >
                <button
                  type="button"
                  aria-expanded={nodeExpanded}
                  className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs font-semibold transition-colors hover:bg-muted/50"
                  onClick={() =>
                    setExpandedNodes((prev) => ({ ...prev, [node.component]: !nodeExpanded }))
                  }
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200',
                        nodeExpanded ? 'rotate-0' : '-rotate-90'
                      )}
                    />
                    <span className="truncate">{node.component}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">{node.total}</span>
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
                              'relative flex w-full items-center justify-between gap-2 px-3 py-1 text-left text-xs transition-colors',
                              isSelected
                                ? 'bg-accent/10 font-semibold text-foreground before:absolute before:inset-y-0.5 before:left-0 before:w-0.5 before:rounded-full before:bg-accent'
                                : 'hover:bg-muted/60'
                            )}
                            onClick={() => onSelect(child.value, isSelected)}
                          >
                            <span className="truncate">{child.label}</span>
                            <span className="inline-flex shrink-0 items-center gap-2">
                              <span className="tabular-nums text-muted-foreground">
                                {child.count}
                              </span>
                              {showSparklines && (
                                <span className="h-1 w-12 overflow-hidden rounded-full bg-foreground/10">
                                  <span
                                    className={cn(
                                      'block h-full rounded-full',
                                      isSelected ? 'bg-accent' : 'bg-primary/40'
                                    )}
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
