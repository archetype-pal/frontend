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
        className="flex w-full snap-x snap-mandatory gap-0.5 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                'min-h-8 shrink-0 snap-start whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-3.5 sm:py-2',
                isActive
                  ? 'bg-white text-primary font-semibold shadow-sm'
                  : 'font-medium text-primary-foreground/70 hover:text-white hover:bg-primary-foreground/10'
              )}
            >
              {resolveResultTypeLabel(item.value, getLabel)}
              {typeof counts?.[item.value] === 'number' && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({counts[item.value]!.toLocaleString()})
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div
        className="pointer-events-none absolute right-0 top-0 z-[1] h-full w-9 bg-gradient-to-l from-primary to-transparent md:hidden"
        aria-hidden
      />
    </div>
  );
}
