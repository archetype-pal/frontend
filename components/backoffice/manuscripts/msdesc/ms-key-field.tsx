'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { TeiRefPicker } from '@/components/backoffice/tei-ref-picker';
import { keyFromRef } from '@/lib/tei-ref-picker';
import type { ResourceKind, ResourceRef } from '@/lib/tei-ref';
import { MsField } from './fields';

/**
 * Authority-`@key` input for a phrase leaf — the raw text input (manual entry
 * preserved) plus a "look up" button that opens the resource picker and stamps
 * the picked resource's `@key` (roadmap 3.2/4.3 form path).
 *
 * The picker must be scoped to kinds that actually YIELD a `@key`, and the
 * field must only be used where that key is semantically right. Person is the
 * only v1 kind with a client-resolvable key (`person_{id}` → `/scribes/{id}`),
 * so `<author>` is the only call site: stamping `key="person_…"` on a
 * `<title>` (a Work authority, deferred to v2) or on an origPlace
 * `<settlement>` would make the renderer link a place or a title to a scribe
 * detail page. Those fields keep the plain text input — their keys stay manual.
 */

/** Module-level so the array identity is stable across parent re-renders. */
export const PERSON_ONLY: readonly ResourceKind[] = ['person'];

export function MsKeyField({
  label,
  value,
  onChange,
  placeholder,
  kinds = PERSON_ONLY,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Resource kinds offered by the lookup (default: Person, the only keyed one). */
  kinds?: readonly ResourceKind[];
}) {
  const t = useTranslations('backoffice');
  const id = React.useId();
  const [open, setOpen] = React.useState(false);

  const handlePick = (ref: ResourceRef) => {
    const key = keyFromRef(ref);
    if (!key) {
      // A target-only kind (place/manuscript/search/external) has no `@key`.
      // Say so instead of closing the dialog on a silent no-op.
      toast.warning(t('msdesc.form.pickKeyNoKey'));
      return;
    }
    onChange(key);
  };

  return (
    <MsField label={label} htmlFor={id}>
      <div className="flex items-center gap-1">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-8 text-sm"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('msdesc.form.pickKey')}
          title={t('msdesc.form.pickKey')}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:text-foreground"
        >
          <Search className="h-3.5 w-3.5" />
        </button>
      </div>
      <TeiRefPicker open={open} onOpenChange={setOpen} onPick={handlePick} kinds={kinds} />
    </MsField>
  );
}
