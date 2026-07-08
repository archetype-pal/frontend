'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { AlertTriangle, CheckCircle2, Code2, Eye, Highlighter, Pencil } from 'lucide-react';

import { ImageTextViewer } from '@/components/text/image-text-viewer';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  HIGHLIGHT_DEFAULT,
  HIGHLIGHT_STORAGE_KEY,
  highlightHsl,
  highlightableOptions,
  type HighlightOption,
} from '@/lib/tei-highlight';
import { docToTei, teiToDoc } from '@/lib/tei-prosemirror';
import type { EditorLinkSelection } from '@/lib/tei-tiptap';
import { validateTei, type TeiValidationError } from '@/services/image-texts';

const loadingBox = (
  <div className="min-h-[320px] px-4 py-3 font-mono text-xs text-muted-foreground">Loading…</div>
);

// Both editors are client-only (touch window/document), so load them lazily.
const TeiCodeMirror = dynamic(() => import('./tei-codemirror'), {
  ssr: false,
  loading: () => loadingBox,
});
const TeiRichEditor = dynamic(() => import('./tei-rich-editor'), {
  ssr: false,
  loading: () => loadingBox,
});

interface TeiTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Auth token for the validation endpoint. */
  token: string | null;
  /** Reports TEI well-formedness so the parent can gate saving. */
  onValidityChange?: (valid: boolean) => void;
  placeholder?: string;
  /**
   * When provided, the Source/Rich/Preview + validity toolbar renders into this
   * element (via portal) instead of inline, and the editor body drops its own
   * chrome. Lets an embedding panel merge the toolbar into its own header rather
   * than stacking a second bar. Omit it for the standalone (backoffice) layout.
   */
  toolbarContainer?: HTMLElement | null;
  /** Initial mode (defaults to Source for the standalone backoffice editor). */
  defaultMode?: Mode;
  /**
   * Hide the raw-TEI Source tab (e.g. the in-viewer panel, which prefers Rich +
   * Preview and points to the full editor for raw editing). Source stays the
   * default for the standalone backoffice editor.
   */
  hideSource?: boolean;
  /**
   * Fired when the effective tab changes (and on mount), plus whether Rich mode
   * is even available for this content. Lets an embedding panel gate region↔text
   * linking to the Rich editor and flag documents that can't enter it.
   */
  onModeChange?: (mode: Mode, richAvailable: boolean) => void;
  /**
   * Fired with the linkable element under the caret while in Rich mode (null in
   * other modes). Bubbled from the rich editor to drive the region-link bar.
   */
  onLinkTargetChange?: (target: EditorLinkSelection | null) => void;
}

export type Mode = 'source' | 'rich' | 'preview';

/**
 * Source/preview editor for TEI-stored ImageText content (Phase H interim).
 *
 * A WYSIWYG can't represent TEI without per-element TipTap marks (the full
 * H.7 editor), and would silently drop `<seg>`/`<persName>` on save. So this
 * edits the TEI source directly and offers a live rendered preview (which goes
 * through the same TEI→HTML translator the public viewer uses). CodeMirror
 * syntax highlighting + schema validation is the later H.8/H.10 polish.
 */
export function TeiTextEditor({
  value,
  onChange,
  token,
  onValidityChange,
  placeholder,
  toolbarContainer,
  defaultMode = 'source',
  hideSource = false,
  onModeChange,
  onLinkTargetChange,
}: TeiTextEditorProps) {
  const [storedMode, setMode] = React.useState<Mode>(defaultMode);
  const [errors, setErrors] = React.useState<TeiValidationError[]>([]);
  const [checked, setChecked] = React.useState(false);
  // Which markup types Preview highlights. Seeded deterministically so SSR and
  // the first client render agree (hydration-safe); hydrated from / persisted to
  // localStorage after mount so a researcher's choice sticks across documents.
  const [highlight, setHighlight] = React.useState<Set<string>>(() => new Set(HIGHLIGHT_DEFAULT));

  // Rich mode only activates when the content round-trips byte-exactly through
  // the serializer, so editing it can never lose markup the model can't hold.
  const richAvailable = React.useMemo(() => {
    try {
      return docToTei(teiToDoc(value)) === value;
    } catch {
      return false;
    }
  }, [value]);

  // Derive the *effective* mode in render rather than chasing the stored `mode`
  // with an effect: the stored value can name a tab that isn't currently usable
  // (Rich needs a byte-exact round-trip; Source can be hidden), so fall back
  // here instead of letting an invalid mode reach the toolbar/body.
  let mode = storedMode;
  if (mode === 'rich' && !richAvailable) mode = hideSource ? 'preview' : 'source';
  // Never sit on a hidden Source tab.
  if (mode === 'source' && hideSource) mode = richAvailable ? 'rich' : 'preview';

  // Surface the effective mode + Rich availability so an embedding panel can
  // gate linking to Rich (and flag docs that can't enter it). Effect, not
  // render-time, so the parent's state update never happens during our render.
  React.useEffect(() => {
    onModeChange?.(mode, richAvailable);
    // The link target only exists while the rich editor is mounted; clear it in
    // Source/Preview so the bar doesn't show a stale phrase.
    if (mode !== 'rich') onLinkTargetChange?.(null);
  }, [mode, richAvailable, onModeChange, onLinkTargetChange]);

  // Debounced well-formedness check against the server validator. The parent
  // uses `onValidityChange` to disable Save while the TEI is malformed.
  React.useEffect(() => {
    if (!token) return;
    // Pessimistically mark invalid until this content is confirmed valid, so a
    // Save fired inside the debounce window (or while a check is pending) can't
    // persist not-yet-validated content on a stale `true`.
    onValidityChange?.(false);
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const result = await validateTei(value, token);
        if (cancelled) return;
        setErrors(result.errors);
        setChecked(true);
        onValidityChange?.(result.valid);
      } catch {
        // Network/endpoint failure: leave Save disabled (validity unknown)
        // rather than trusting a stale prior result.
        if (!cancelled) setChecked(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [value, token, onValidityChange]);

  // Hydrate the persisted highlight preference after mount (keeps first render
  // deterministic), then persist on every change.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(HIGHLIGHT_STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from a client-only source (localStorage) MUST happen post-mount: reading it during render would desync SSR/first-client render. Deliberate, runs once.
        setHighlight(new Set(parsed.filter((v): v is string => typeof v === 'string')));
      }
    } catch {
      /* unavailable or corrupt storage → keep the default */
    }
  }, []);
  React.useEffect(() => {
    try {
      localStorage.setItem(HIGHLIGHT_STORAGE_KEY, JSON.stringify([...highlight]));
    } catch {
      /* storage unavailable → preference is session-only, no-op */
    }
  }, [highlight]);

  // The highlightable markup present in this document (Preview only) and the
  // selection passed to the viewer. Both memoised so the viewer's own memo is stable.
  const highlightOptions = React.useMemo(
    () => (mode === 'preview' ? highlightableOptions(value) : []),
    [mode, value]
  );
  const highlightList = React.useMemo(() => Array.from(highlight), [highlight]);
  const toggleHighlight = React.useCallback((type: string) => {
    setHighlight((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);
  const clearHighlight = React.useCallback(() => setHighlight(new Set()), []);

  const valid = errors.length === 0;
  const hosted = Boolean(toolbarContainer);

  // Hosted in a panel header: render icon-only tabs + an icon-only validity badge
  // so the whole bar fits a narrow (split-column) header without a second row.
  const toolbar = (
    <div className={cn('flex items-center gap-1', hosted ? 'flex-wrap' : 'border-b px-2 py-1.5')}>
      {!hideSource && (
        <ModeButton
          active={mode === 'source'}
          onClick={() => setMode('source')}
          icon={Code2}
          label="Source"
          compact={hosted}
        />
      )}
      <ModeButton
        active={mode === 'rich'}
        onClick={() => setMode('rich')}
        icon={Pencil}
        label="Rich"
        compact={hosted}
        disabled={!richAvailable}
        title={
          richAvailable
            ? undefined
            : hideSource
              ? 'Rich editing unavailable for this document — use “Open in the full editor”'
              : 'Rich editing unavailable for this document — use Source'
        }
      />
      <ModeButton
        active={mode === 'preview'}
        onClick={() => setMode('preview')}
        icon={Eye}
        label="Preview"
        compact={hosted}
      />
      {mode === 'preview' && (
        <HighlightMenu
          options={highlightOptions}
          selected={highlight}
          onToggle={toggleHighlight}
          onClear={clearHighlight}
          compact={hosted}
        />
      )}
      {checked &&
        (valid ? (
          <span
            className={cn(
              'flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400',
              hosted ? '' : 'ml-auto'
            )}
            title="Valid TEI"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> {!hosted && 'Valid TEI'}
          </span>
        ) : (
          <span
            className={cn(
              'flex items-center gap-1 text-[11px] font-medium text-destructive',
              hosted ? '' : 'ml-auto'
            )}
            title={errors[0] ? `Line ${errors[0].line}: ${errors[0].message}` : 'Invalid TEI'}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {!hosted &&
              (errors[0] ? `Line ${errors[0].line}: ${errors[0].message}` : 'Invalid TEI')}
          </span>
        ))}
      {!checked && !hosted && (
        <span className="ml-auto pr-1 text-[11px] uppercase tracking-wide text-muted-foreground">
          TEI
        </span>
      )}
    </div>
  );

  return (
    <div className={cn(hosted ? '' : 'rounded-md border')}>
      {toolbarContainer ? createPortal(toolbar, toolbarContainer) : toolbar}

      {mode === 'source' && (
        <TeiCodeMirror value={value} onChange={onChange} placeholder={placeholder} />
      )}
      {mode === 'rich' && (
        <TeiRichEditor
          value={value}
          onChange={onChange}
          stickyToolbar={hosted}
          onLinkTargetChange={onLinkTargetChange}
        />
      )}
      {mode === 'preview' && (
        <div className="min-h-[320px] px-4 py-3">
          {/* highlightTypes puts Preview in `.tei-hl-mode`: only the markup types
              chosen in the Highlight dropdown are highlighted (default: name +
              salutation), instead of the blanket `.tei-rich` element highlight. */}
          <ImageTextViewer html={value} highlightTypes={highlightList} />
        </div>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
  compact = false,
  disabled = false,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Code2;
  label: string;
  /** Icon-only (label moves to the tooltip) — for narrow hosted headers. */
  compact?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? (compact ? label : undefined)}
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        compact ? 'h-7 w-7 justify-center' : 'px-2.5 py-1',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {!compact && label}
    </button>
  );
}

/**
 * Preview-only control: a checklist of the markup types present in the document,
 * governing which get highlighted. Multi-select (the menu stays open on toggle);
 * compact (icon + count) in a narrow hosted header.
 */
function HighlightMenu({
  options,
  selected,
  onToggle,
  onClear,
  compact,
}: {
  options: HighlightOption[];
  selected: Set<string>;
  onToggle: (type: string) => void;
  onClear: () => void;
  compact: boolean;
}) {
  const count = options.reduce((n, o) => (selected.has(o.value) ? n + 1 : n), 0);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Choose which markup types to highlight"
          aria-label="Highlight markup types"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            compact ? 'h-7 px-1.5' : 'px-2.5 py-1'
          )}
        >
          <Highlighter className="h-3.5 w-3.5" />
          {!compact && 'Highlight'}
          {count > 0 && (
            <span className="rounded bg-primary/15 px-1 text-[10px] font-semibold text-primary">
              {count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="flex items-center justify-between">
          Highlight
          {selected.size > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] font-normal text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">No markup in this text.</p>
        ) : (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selected.has(option.value)}
              onCheckedChange={() => onToggle(option.value)}
              // Keep the menu open so several types can be toggled in one pass.
              onSelect={(event) => event.preventDefault()}
            >
              <span
                aria-hidden
                className="mr-2 inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: highlightHsl(option.value) }}
              />
              {option.label}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
