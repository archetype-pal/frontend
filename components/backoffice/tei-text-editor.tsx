'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, CheckCircle2, Code2, Eye } from 'lucide-react';

import { ImageTextViewer } from '@/components/text/image-text-viewer';
import { cn } from '@/lib/utils';
import { validateTei, type TeiValidationError } from '@/services/image-texts';

// CodeMirror is client-only (touches window/document), so load it lazily and
// skip SSR; a plain box stands in until it hydrates.
const TeiCodeMirror = dynamic(() => import('./tei-codemirror'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[320px] px-4 py-3 font-mono text-xs text-muted-foreground">
      Loading editor…
    </div>
  ),
});

interface TeiTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Auth token for the validation endpoint. */
  token: string | null;
  /** Reports TEI well-formedness so the parent can gate saving. */
  onValidityChange?: (valid: boolean) => void;
  placeholder?: string;
}

type Mode = 'source' | 'preview';

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
}: TeiTextEditorProps) {
  const [mode, setMode] = React.useState<Mode>('source');
  const [errors, setErrors] = React.useState<TeiValidationError[]>([]);
  const [checked, setChecked] = React.useState(false);

  // Debounced well-formedness check against the server validator. The parent
  // uses `onValidityChange` to disable Save while the TEI is malformed.
  React.useEffect(() => {
    if (!token) return;
    const handle = setTimeout(async () => {
      try {
        const result = await validateTei(value, token);
        setErrors(result.errors);
        setChecked(true);
        onValidityChange?.(result.valid);
      } catch {
        // Network/endpoint failure shouldn't block editing; treat as unknown.
        setChecked(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [value, token, onValidityChange]);

  const valid = errors.length === 0;

  return (
    <div className="rounded-md border">
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <ModeButton active={mode === 'source'} onClick={() => setMode('source')} icon={Code2}>
          Source
        </ModeButton>
        <ModeButton active={mode === 'preview'} onClick={() => setMode('preview')} icon={Eye}>
          Preview
        </ModeButton>
        {checked &&
          (valid ? (
            <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Valid TEI
            </span>
          ) : (
            <span
              className="ml-auto flex items-center gap-1 text-[11px] font-medium text-destructive"
              title={errors[0] ? `Line ${errors[0].line}: ${errors[0].message}` : undefined}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {errors[0] ? `Line ${errors[0].line}: ${errors[0].message}` : 'Invalid TEI'}
            </span>
          ))}
        {!checked && (
          <span className="ml-auto pr-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            TEI
          </span>
        )}
      </div>

      {mode === 'source' ? (
        <TeiCodeMirror value={value} onChange={onChange} placeholder={placeholder} />
      ) : (
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
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Code2;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}
