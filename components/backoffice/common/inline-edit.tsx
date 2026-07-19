'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void | Promise<void>;
  /** Render the display value differently from the raw string. */
  renderValue?: (value: string) => React.ReactNode;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

/**
 * Click-to-edit text field.
 * Displays the value as plain text; clicking activates an input.
 * Saves on Enter or blur, cancels on Escape.
 */
export function InlineEdit({
  value,
  onSave,
  renderValue,
  placeholder,
  className,
  inputClassName,
  disabled = false,
}: InlineEditProps) {
  const t = useTranslations('backoffice');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes: when the prop changes while not editing,
  // adjust draft during render instead of in an effect (React docs pattern).
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (!editing) setDraft(value);
  }

  // Focus the input when entering edit mode
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = useCallback(async () => {
    const trimmed = draft.trim();
    if (trimmed === value) {
      setDraft(value); // discard a whitespace-only edit so the next edit starts clean
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [draft, value, onSave]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      cancel();
    }
  };

  if (editing) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={save}
          disabled={saving}
          className={cn('h-7 text-sm', inputClassName)}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onMouseDown={(e) => e.preventDefault()} // prevent blur before click
          onClick={save}
          disabled={saving}
          aria-label={t('inlineEdit.saveEdit')}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onMouseDown={(e) => e.preventDefault()}
          onClick={cancel}
          disabled={saving}
          aria-label={t('inlineEdit.cancelEdit')}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      className={cn(
        'group inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-sm transition-colors hover:bg-accent',
        !value && 'text-muted-foreground italic',
        disabled && 'cursor-default opacity-60',
        className
      )}
    >
      {(renderValue ? renderValue(value) : null) ??
        (value || (placeholder ?? t('inlineEdit.placeholder')))}
      {!disabled && (
        <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
      )}
    </button>
  );
}
