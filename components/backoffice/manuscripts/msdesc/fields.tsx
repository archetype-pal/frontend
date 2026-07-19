'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MSDESC_VOCABS, msdescVocabLabelKey } from '@/lib/msdesc-vocab';
import type { MsDescVocabId, MsDescVocabValue } from '@/lib/msdesc-vocab';
import { cn } from '@/lib/utils';

/**
 * Shared field primitives for the msDesc area forms (roadmap 2.2-UI):
 * labelled text inputs, closed-vocab dropdowns fed by `lib/msdesc-vocab.ts`,
 * monospace TEI-prose textareas (plain until the Phase-3 rich editor), and
 * add/remove list chrome. All labels are i18n keys under `backoffice.msdesc`.
 */

const NONE_VALUE = '__none';

export function MsField({
  label,
  children,
  className,
  htmlFor,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

export function MsTextField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <MsField label={label} htmlFor={id} className={className}>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
    </MsField>
  );
}

/**
 * Closed-vocabulary dropdown (§8.5 structural conformance): only canonical
 * ODD values are selectable, displayed through their i18n glosses. The empty
 * choice maps to `undefined` (attribute absent).
 */
export function MsVocabSelect<V extends MsDescVocabId>({
  vocab,
  label,
  value,
  onChange,
  className,
}: {
  vocab: V;
  label: string;
  value: MsDescVocabValue<V> | undefined;
  onChange: (value: MsDescVocabValue<V> | undefined) => void;
  className?: string;
}) {
  const t = useTranslations('backoffice');
  const values = MSDESC_VOCABS[vocab] as readonly MsDescVocabValue<V>[];
  return (
    <MsField label={label} className={className}>
      <Select
        value={value ?? NONE_VALUE}
        onValueChange={(next) =>
          onChange(next === NONE_VALUE ? undefined : (next as MsDescVocabValue<V>))
        }
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>{t('msdesc.form.none')}</SelectItem>
          {values.map((option) => (
            <SelectItem key={option} value={option}>
              {t(msdescVocabLabelKey(vocab, option))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </MsField>
  );
}

/**
 * Verbatim TEI-prose leaf (`<p>`-sequence inner XML) as a monospace textarea.
 * Phase 3 mounts the rich editor on these same strings.
 */
export function MsProseTextarea({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const t = useTranslations('backoffice');
  const id = useId();
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        <span className="text-[10px] text-muted-foreground/70">{t('msdesc.editor.proseHint')}</span>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}

export function MsAddButton({ label, onClick }: { label: string; onClick: () => void }) {
  const t = useTranslations('backoffice');
  return (
    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={onClick}>
      <Plus className="h-3 w-3" />
      {t('msdesc.form.addItem', { label })}
    </Button>
  );
}

export function MsRemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  const t = useTranslations('backoffice');
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-muted-foreground hover:text-destructive"
      onClick={onClick}
      aria-label={t('msdesc.form.removeItem', { label })}
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  );
}

/** Bordered sub-section with a small heading and optional remove control. */
export function MsSubsection({
  title,
  onRemove,
  children,
  className,
}: {
  title: string;
  onRemove?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2 rounded-md border p-3', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
        {onRemove && <MsRemoveButton label={title} onClick={onRemove} />}
      </div>
      {children}
    </div>
  );
}

/**
 * Optional structural section: an add button while absent, a removable
 * subsection while present — mirrors the form model's `undefined` composites.
 */
export function MsOptionalSection({
  title,
  present,
  onAdd,
  onRemove,
  children,
}: {
  title: string;
  present: boolean;
  onAdd: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  if (!present) return <MsAddButton label={title} onClick={onAdd} />;
  return (
    <MsSubsection title={title} onRemove={onRemove}>
      {children}
    </MsSubsection>
  );
}
