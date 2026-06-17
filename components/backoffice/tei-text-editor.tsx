'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { AlertTriangle, CheckCircle2, Code2, Eye, Pencil } from 'lucide-react';

import { ImageTextViewer } from '@/components/text/image-text-viewer';
import { cn } from '@/lib/utils';
import { docToTei, teiToDoc } from '@/lib/tei-prosemirror';
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
}

type Mode = 'source' | 'rich' | 'preview';

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
}: TeiTextEditorProps) {
  const [storedMode, setMode] = React.useState<Mode>(defaultMode);
  const [errors, setErrors] = React.useState<TeiValidationError[]>([]);
  const [checked, setChecked] = React.useState(false);

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
        <TeiRichEditor value={value} onChange={onChange} stickyToolbar={hosted} />
      )}
      {mode === 'preview' && (
        <div className="min-h-[320px] px-4 py-3">
          <ImageTextViewer html={value} />
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
