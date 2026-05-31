'use client';

import * as React from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type FacetDateRangePanelProps = {
  id?: string;
  title?: string;
  range?: [number, number];
  defaultValue?: [number, number];
  precisionOptions?: { label: string; value: string }[];
  defaultExpanded?: boolean;

  onSearch?: (params: { min: number; max: number; precision: string; diff: number }) => void;
};

export function FacetDateRangePanel({
  id,
  title = 'Text Date',
  range,
  defaultValue = [1094, 1250],
  precisionOptions = [
    { label: 'None', value: ' ' },
    { label: 'at most', value: 'at most' },
    { label: 'at least', value: 'at least' },
  ],
  defaultExpanded = true,
  onSearch,
}: FacetDateRangePanelProps) {
  const normalizedDefaultValue = range ?? defaultValue;
  const [expanded, setExpanded] = React.useState<boolean>(defaultExpanded);
  const [sliderValue, setSliderValue] = React.useState<[number, number]>(normalizedDefaultValue);
  const [precision, setPrecision] = React.useState<string>(precisionOptions[0].value);
  const [year, setYear] = React.useState<number | ''>('');
  const [searchInput, setSearchInput] = React.useState<string>(
    `${normalizedDefaultValue[0]}x${normalizedDefaultValue[1]}`
  );
  const initialPrecision = precisionOptions[0].value;
  const [endpointMin, endpointMax] = normalizedDefaultValue;
  const applySignatureRef = React.useRef<string>('');
  const userInteractedRef = React.useRef(false);

  React.useEffect(() => {
    // Reset interaction flag when new range data arrives (e.g. result type change)
    userInteractedRef.current = false;
    setSliderValue(normalizedDefaultValue);
    setSearchInput(`${normalizedDefaultValue[0]}x${normalizedDefaultValue[1]}`);
  }, [normalizedDefaultValue]);

  const buildPayload = React.useCallback(() => {
    const diff = precision === initialPrecision || year === '' ? 0 : year;
    return {
      min: sliderValue[0],
      max: sliderValue[1],
      precision,
      diff,
    };
  }, [initialPrecision, precision, sliderValue, year]);

  const handleSliderChange = (value: number[]) => {
    userInteractedRef.current = true;
    const [newMin, newMax] = [value[0], value[1]] as [number, number];
    setSliderValue([newMin, newMax]);
    setSearchInput(`${newMin}x${newMax}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    userInteractedRef.current = true;
    const raw = e.target.value;
    setSearchInput(raw);

    const [minStr, maxStr] = raw.split('x');
    if (minStr != null && maxStr != null) {
      const parsedMin = parseInt(minStr, 10);
      const parsedMax = parseInt(maxStr, 10);
      const [fixedMin, fixedMax] = normalizedDefaultValue;

      if (
        !Number.isNaN(parsedMin) &&
        !Number.isNaN(parsedMax) &&
        parsedMin >= fixedMin &&
        parsedMax <= fixedMax &&
        parsedMin <= parsedMax
      ) {
        setSliderValue([parsedMin, parsedMax]);
      }
    }
  };

  const handleSearchSubmit = React.useCallback(() => {
    const payload = buildPayload();
    const signature = JSON.stringify(payload);
    if (applySignatureRef.current === signature) return;
    applySignatureRef.current = signature;
    onSearch?.(payload);
  }, [buildPayload, onSearch]);

  const handlePrecisionChange = (val: string) => {
    userInteractedRef.current = true;
    setPrecision(val);
    if (val === precisionOptions[0].value) {
      setYear('');
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    userInteractedRef.current = true;
    const val = e.target.value ? parseInt(e.target.value, 10) : '';
    if (precision === precisionOptions[0].value) {
      setYear('');
    } else {
      setYear(val);
    }
  };

  const handleReset = React.useCallback(() => {
    const [min, max] = normalizedDefaultValue;
    setSliderValue([min, max]);
    setSearchInput(`${min}x${max}`);
    setPrecision(initialPrecision);
    setYear('');
    const payload = { min, max, precision: initialPrecision, diff: 0 };
    applySignatureRef.current = JSON.stringify(payload);
    onSearch?.(payload);
  }, [initialPrecision, normalizedDefaultValue, onSearch]);

  React.useEffect(() => {
    if (!userInteractedRef.current) return;
    const timer = window.setTimeout(() => {
      handleSearchSubmit();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [sliderValue, precision, year, handleSearchSubmit]);

  return (
    <div id={id} className="overflow-hidden rounded-lg border border-border/60 bg-card/50">
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40"
      >
        <h4 className="font-serif text-[13px] font-semibold tracking-tight text-foreground">
          {title}
        </h4>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            expanded ? 'rotate-0' : '-rotate-90'
          )}
        />
      </button>

      {expanded && (
        <div className="max-h-56 space-y-4 overflow-y-auto border-t border-border/50 p-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={handleSearchChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchSubmit();
                }
              }}
              placeholder="Search text date..."
              className="pl-8"
              aria-label="Date range (min x max)"
            />
          </div>

          <div>
            <Slider
              min={endpointMin}
              max={endpointMax}
              step={1}
              value={sliderValue}
              onValueChange={handleSliderChange}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
              <span>{endpointMin}</span>
              <span>{endpointMax}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor={`${id}-precision`} className="text-sm font-medium">
              Precision (in years)
            </label>
            <div className="flex items-center gap-2">
              <Select value={precision} onValueChange={handlePrecisionChange}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {precisionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                min={0}
                className="w-20 h-9"
                value={year}
                onChange={handleYearChange}
                placeholder="0"
                aria-label="Year difference"
                disabled={precision === precisionOptions[0].value}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              onClick={handleReset}
            >
              Reset
            </button>
            <Button type="button" size="sm" onClick={handleSearchSubmit}>
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
