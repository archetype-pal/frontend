import { resultTypeItems, type ResultType } from '@/lib/search-types';
import { resolveResultTypeLabel } from '@/lib/search-label-helpers';
import { useModelLabels } from '@/contexts/model-labels-context';
import { cn } from '@/lib/utils';

export function ResultTypeToggle({
  selectedType,
  onChange,
  enabledTypes,
  counts,
}: {
  selectedType: ResultType;
  onChange: (next: ResultType) => void;
  enabledTypes?: ResultType[];
  counts?: Partial<Record<ResultType, number>>;
}) {
  const { getLabel } = useModelLabels();
  const items = enabledTypes
    ? resultTypeItems.filter((item) => enabledTypes.includes(item.value))
    : resultTypeItems;

  return (
    <div className="relative min-h-0 w-full min-w-0">
      <div
        className="flex w-full snap-x snap-mandatory items-end gap-1 overflow-x-auto scroll-smooth pr-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Search result type"
      >
        {items.map((item) => {
          const isActive = selectedType === item.value;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(item.value)}
              className={cn(
                'group relative min-h-8 shrink-0 snap-start whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 sm:px-3',
                isActive
                  ? 'font-semibold text-primary'
                  : 'font-medium text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="font-serif tracking-tight">
                {resolveResultTypeLabel(item.value, getLabel)}
              </span>
              {typeof counts?.[item.value] === 'number' && (
                <span
                  className={cn(
                    'ml-1 text-xs tabular-nums',
                    isActive ? 'text-primary/55' : 'text-muted-foreground/55'
                  )}
                >
                  {counts[item.value]!.toLocaleString()}
                </span>
              )}
              {/* Gold underline for the active type — echoes the global nav's
                  active-link idiom (border-accent). Sits just beneath the label. */}
              <span
                aria-hidden
                className={cn(
                  'pointer-events-none absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent transition-all duration-200',
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-30'
                )}
              />
            </button>
          );
        })}
      </div>
      <div
        className="pointer-events-none absolute right-0 top-0 z-[1] h-full w-8 bg-gradient-to-l from-card to-transparent"
        aria-hidden
      />
    </div>
  );
}
