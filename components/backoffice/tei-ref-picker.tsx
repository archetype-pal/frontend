'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ExternalLink, Images, MapPin, Search, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { useDebouncedSearch } from '@/hooks/backoffice/use-debounced-search';
import { buildRefMarkup, type ResourceKind, type ResourceRef } from '@/lib/tei-ref';
import {
  REF_INDEX_SEGMENT,
  REF_PICKER_KINDS,
  externalRef,
  imageRefsFromHits,
  isSearchableRefKind,
  manuscriptRefFromItemPart,
  personRefFromScribe,
  placeRef,
  placeRefsFromHits,
  savedSearchRef,
  type SearchableRefKind,
} from '@/lib/tei-ref-picker';
import { getSavedSearches } from '@/lib/saved-searches';
import {
  searchItemImages,
  searchItemParts,
  searchPlaces,
  searchScribes,
} from '@/services/tei-ref-search';

interface TeiRefPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired with the chosen reference; the picker then closes. */
  onPick: (ref: ResourceRef) => void;
  /** Restrict the available resource tabs (default: all five). */
  kinds?: readonly ResourceKind[];
  /** Seed for the query / External link-text (e.g. the current selection). */
  seedText?: string;
}

const KIND_ICON: Record<ResourceKind, React.ComponentType<{ className?: string }>> = {
  person: User,
  place: MapPin,
  manuscript: BookOpen,
  image: Images,
  search: Search,
  external: ExternalLink,
};

/** Fetch + map hits for one searchable index tab into ResourceRefs. */
async function runIndexSearch(
  kind: SearchableRefKind,
  q: string,
  signal?: AbortSignal
): Promise<ResourceRef[]> {
  if (kind === 'person') return (await searchScribes(q, 12, signal)).map(personRefFromScribe);
  if (kind === 'manuscript') {
    return (await searchItemParts(q, 12, signal)).map(manuscriptRefFromItemPart);
  }
  // Before the place fall-through: a new searchable kind that reaches the last
  // line would silently run a PLACE search and return plausible-looking refs of
  // the wrong kind.
  if (kind === 'image') return imageRefsFromHits(await searchItemImages(q, 12, signal));
  return placeRefsFromHits(await searchPlaces(q, 20, signal));
}

/**
 * Resource picker (roadmap 4.2): a Radix-Dialog-hosted CommandDialog-style
 * chooser with Person · Place · Manuscript · Search · External tabs. Person /
 * Place / Manuscript query the public search indexes; Search lists saved
 * searches; External is a free-text URL. Emits a {@link ResourceRef} on pick.
 */
export function TeiRefPicker({ open, onOpenChange, onPick, kinds, seedText }: TeiRefPickerProps) {
  const t = useTranslations('backoffice');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogHeader className="px-4 pb-2 pt-4">
          <DialogTitle>{t('msdesc.refPicker.title')}</DialogTitle>
          <DialogDescription>{t('msdesc.refPicker.description')}</DialogDescription>
        </DialogHeader>
        {/*
          All transient state lives in the body, which Radix unmounts when the
          dialog closes — so "reset on open" is the mount itself. It deliberately
          does NOT run a reset effect: `kinds` is passed as an inline array
          literal by callers, so any parent re-render (e.g. the area panel's
          debounced validate-tei resolving) would re-run such an effect and wipe
          the query the cataloguer is mid-way through typing.
        */}
        <PickerBody kinds={kinds} seedText={seedText} onPick={onPick} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

function PickerBody({
  kinds,
  seedText,
  onPick,
  onOpenChange,
}: {
  kinds?: readonly ResourceKind[];
  seedText?: string;
  onPick: (ref: ResourceRef) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('backoffice');
  // Keyed on the JOINED string, not the array identity: callers pass inline
  // literals, so an identity-keyed memo would recompute on every parent render.
  const kindsKey = kinds ? kinds.join('|') : '';
  const tabs = React.useMemo(() => {
    const allowed = kindsKey === '' ? null : new Set(kindsKey.split('|'));
    return REF_PICKER_KINDS.filter((k) => (allowed ? allowed.has(k) : true));
  }, [kindsKey]);

  const [activeKind, setActiveKind] = React.useState<ResourceKind>(() => tabs[0] ?? 'person');
  const { searchInput, setSearchInput, search } = useDebouncedSearch(300, seedText ?? '');
  const [externalUrl, setExternalUrl] = React.useState('');
  const [externalText, setExternalText] = React.useState(() => seedText ?? '');

  const emit = React.useCallback(
    (ref: ResourceRef) => {
      onPick(ref);
      onOpenChange(false);
    },
    [onPick, onOpenChange]
  );

  return (
    <>
      {tabs.length > 1 && (
        <div className="px-4 pb-2">
          <Segmented<ResourceKind>
            ariaLabel={t('msdesc.refPicker.tabsLabel')}
            value={activeKind}
            onChange={setActiveKind}
            options={tabs.map((k) => ({ value: k, label: t(`msdesc.refPicker.tab.${k}`) }))}
          />
        </div>
      )}

      <div className="border-t">
        {isSearchableRefKind(activeKind) ? (
          <IndexSearchTab
            kind={activeKind}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            search={search}
            onPick={emit}
          />
        ) : activeKind === 'search' ? (
          <SavedSearchTab searchInput={searchInput} setSearchInput={setSearchInput} onPick={emit} />
        ) : (
          <ExternalTab
            url={externalUrl}
            setUrl={setExternalUrl}
            text={externalText}
            setText={setExternalText}
            onPick={emit}
          />
        )}
      </div>
    </>
  );
}

function RefRow({ refItem, onPick }: { refItem: ResourceRef; onPick: (ref: ResourceRef) => void }) {
  const Icon = KIND_ICON[refItem.kind];
  return (
    <CommandItem
      // A stable, unique value so cmdk never collapses two same-label rows.
      value={`${refItem.kind}:${refItem.id ?? refItem.target}:${refItem.label}`}
      onSelect={() => onPick(refItem)}
      className="flex items-center gap-2"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{refItem.label}</span>
      <code className="max-w-[45%] truncate text-[10px] text-muted-foreground">
        {refItem.target}
      </code>
    </CommandItem>
  );
}

function IndexSearchTab({
  kind,
  searchInput,
  setSearchInput,
  search,
  onPick,
}: {
  kind: SearchableRefKind;
  searchInput: string;
  setSearchInput: (value: string) => void;
  search: string;
  onPick: (ref: ResourceRef) => void;
}) {
  const t = useTranslations('backoffice');
  const segment = REF_INDEX_SEGMENT[kind];
  const query = search.trim();
  // The tab only exists while the dialog is open (Radix unmounts the body on
  // close), so the query needs no extra `open` gate.
  const { data: results = [], isFetching } = useQuery({
    queryKey: ['tei-ref-search', segment, query],
    queryFn: ({ signal }) => runIndexSearch(kind, query, signal),
    enabled: query.length > 0,
    staleTime: 60_000,
  });

  // For a place, always offer the free-text query itself as a search link — a
  // place need not appear in the corpus index to be linkable (§8.3).
  const rows: ResourceRef[] =
    kind === 'place' && query.length > 0 ? withPlaceFallback(results, query) : results;

  return (
    <Command shouldFilter={false}>
      <CommandInput
        value={searchInput}
        onValueChange={setSearchInput}
        placeholder={t(`msdesc.refPicker.placeholder.${kind}`)}
      />
      <CommandList>
        <CommandEmpty>
          {query.length === 0
            ? t('msdesc.refPicker.typeToSearch')
            : isFetching
              ? t('msdesc.refPicker.searching')
              : t('msdesc.refPicker.noResults')}
        </CommandEmpty>
        {rows.length > 0 && (
          <CommandGroup>
            {rows.map((refItem) => (
              <RefRow
                key={`${refItem.kind}:${refItem.id ?? refItem.target}`}
                refItem={refItem}
                onPick={onPick}
              />
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}

/** Prepend the raw-query place link when no indexed hit already matches it. */
function withPlaceFallback(results: ResourceRef[], query: string): ResourceRef[] {
  const fallback = placeRef(query);
  const exists = results.some((r) => r.label.toLowerCase() === fallback.label.toLowerCase());
  return exists ? results : [fallback, ...results];
}

function SavedSearchTab({
  searchInput,
  setSearchInput,
  onPick,
}: {
  searchInput: string;
  setSearchInput: (value: string) => void;
  onPick: (ref: ResourceRef) => void;
}) {
  const t = useTranslations('backoffice');
  // localStorage-backed; read once per mount (the tab remounts on each open).
  const saved = React.useMemo(
    () =>
      getSavedSearches()
        .map(savedSearchRef)
        .filter((r): r is ResourceRef => r !== null),
    []
  );

  return (
    <Command>
      <CommandInput
        value={searchInput}
        onValueChange={setSearchInput}
        placeholder={t('msdesc.refPicker.placeholder.search')}
      />
      <CommandList>
        <CommandEmpty>{t('msdesc.refPicker.noSavedSearches')}</CommandEmpty>
        {saved.length > 0 && (
          <CommandGroup>
            {saved.map((refItem) => (
              <RefRow key={refItem.target} refItem={refItem} onPick={onPick} />
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}

function ExternalTab({
  url,
  setUrl,
  text,
  setText,
  onPick,
}: {
  url: string;
  setUrl: (value: string) => void;
  text: string;
  setText: (value: string) => void;
  onPick: (ref: ResourceRef) => void;
}) {
  const t = useTranslations('backoffice');
  const urlId = React.useId();
  const textId = React.useId();
  const candidate = externalRef(url, text);
  const preview = safePreview(candidate);

  return (
    <div className="space-y-3 p-4">
      <div className="space-y-1">
        <label htmlFor={urlId} className="text-xs font-medium text-muted-foreground">
          {t('msdesc.refPicker.externalUrl')}
        </label>
        <Input
          id={urlId}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.org/record"
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor={textId} className="text-xs font-medium text-muted-foreground">
          {t('msdesc.refPicker.externalText')}
        </label>
        <Input
          id={textId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('msdesc.refPicker.externalTextPlaceholder')}
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">
          {t('msdesc.refPicker.preview')}
        </span>
        <code className="block overflow-x-auto rounded-md border bg-muted/40 px-2 py-1.5 text-[11px]">
          {preview ?? (url.trim() === '' ? '—' : t('msdesc.refPicker.invalidUrl'))}
        </code>
      </div>
      <div className="flex justify-end">
        <Button size="sm" disabled={!candidate} onClick={() => candidate && onPick(candidate)}>
          {t('msdesc.refPicker.insert')}
        </Button>
      </div>
    </div>
  );
}

/** The serialized `<ref>` for a candidate, or null (unsafe/empty → no preview). */
function safePreview(ref: ResourceRef | null): string | null {
  if (!ref) return null;
  try {
    return buildRefMarkup(ref, ref.label);
  } catch {
    return null;
  }
}
