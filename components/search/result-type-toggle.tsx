import { resultTypeItems, type ResultType } from '@/lib/search-types';
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
                'min-h-8 shrink-0 snap-start whitespace-nowrap border-b-2 px-2 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-2.5 sm:py-2',
                isActive
                  ? 'border-b-primary font-semibold text-foreground'
                  : 'border-b-transparent font-medium text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
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
        className="pointer-events-none absolute right-0 top-0 z-[1] h-full w-9 bg-gradient-to-l from-background to-transparent md:hidden"
        aria-hidden
      />
    </div>
  );
}
