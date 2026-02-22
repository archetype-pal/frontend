'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  /** Value when no filter is applied (defaults to '__all'). */
  allValue?: string;
}

interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
}

export function FilterBar({ filters, values, onChange, onClear }: FilterBarProps) {
  const activeCount = filters.filter(
    (f) => values[f.key] && values[f.key] !== (f.allValue ?? '__all')
  ).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={values[filter.key] ?? filter.allValue ?? '__all'}
          onValueChange={(val) => onChange(filter.key, val)}
        >
          <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={filter.allValue ?? '__all'}>All {filter.label}</SelectItem>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={onClear}>
          <X className="h-3 w-3" />
          Clear filters
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
            {activeCount}
          </Badge>
        </Button>
      )}
    </div>
  );
}
