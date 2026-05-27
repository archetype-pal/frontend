'use client';

import * as React from 'react';
import { Code2, Eye } from 'lucide-react';

import { ImageTextViewer } from '@/components/text/image-text-viewer';
import { cn } from '@/lib/utils';

interface TeiTextEditorProps {
  value: string;
  onChange: (value: string) => void;
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
export function TeiTextEditor({ value, onChange, placeholder }: TeiTextEditorProps) {
  const [mode, setMode] = React.useState<Mode>('source');

  return (
    <div className="rounded-md border">
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <ModeButton active={mode === 'source'} onClick={() => setMode('source')} icon={Code2}>
          Source
        </ModeButton>
        <ModeButton active={mode === 'preview'} onClick={() => setMode('preview')} icon={Eye}>
          Preview
        </ModeButton>
        <span className="ml-auto pr-1 text-[11px] uppercase tracking-wide text-muted-foreground">
          TEI
        </span>
      </div>

      {mode === 'source' ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className="block min-h-[320px] w-full resize-y bg-transparent px-4 py-3 font-mono text-xs leading-relaxed focus:outline-none"
        />
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
