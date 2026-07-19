'use client';

import { useTranslations } from 'next-intl';

import type { MsAltIdentifier, MsIdentifierState } from '@/lib/msdesc-form';
import { MsAddButton, MsSubsection, MsTextField } from './fields';

/** msIdentifier area form (roadmap 2.2): repository identity + shelfmark. */
export function MsIdentifierForm({
  state,
  onChange,
}: {
  state: MsIdentifierState;
  onChange: (next: MsIdentifierState) => void;
}) {
  const t = useTranslations('backoffice');
  const f = (key: string) => t(`msdesc.render.fields.${key}`);
  const set = (patch: Partial<MsIdentifierState>) => onChange({ ...state, ...patch });
  const opt = (value: string): string | undefined => (value === '' ? undefined : value);

  const updateAlt = (index: number, next: MsAltIdentifier) =>
    set({ altIdentifiers: state.altIdentifiers.map((alt, i) => (i === index ? next : alt)) });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MsTextField
          label={f('country')}
          value={state.country}
          onChange={(v) => set({ country: v })}
        />
        <MsTextField
          label={f('settlement')}
          value={state.settlement}
          onChange={(v) => set({ settlement: v })}
        />
        <MsTextField
          label={f('institution')}
          value={state.institution}
          onChange={(v) => set({ institution: v })}
        />
        <MsTextField
          label={f('repository')}
          value={state.repository}
          onChange={(v) => set({ repository: v })}
        />
        <MsTextField
          label={f('shelfmark')}
          value={state.shelfmark}
          onChange={(v) => set({ shelfmark: v })}
        />
        <MsTextField
          label={f('msName')}
          value={state.msName ?? ''}
          onChange={(v) => set({ msName: opt(v) })}
        />
      </div>

      <div className="space-y-2">
        {state.altIdentifiers.map((alt, index) => (
          <MsSubsection
            key={index}
            title={`${f('altIdentifier')} ${index + 1}`}
            onRemove={() =>
              set({ altIdentifiers: state.altIdentifiers.filter((_, i) => i !== index) })
            }
          >
            <div className="grid grid-cols-3 gap-3">
              <MsTextField
                label={t('msdesc.render.fields.type')}
                value={alt.type ?? ''}
                onChange={(v) => updateAlt(index, { ...alt, type: opt(v) })}
              />
              <MsTextField
                label={t('msdesc.form.idnoType')}
                value={alt.idnoType ?? ''}
                onChange={(v) => updateAlt(index, { ...alt, idnoType: opt(v) })}
              />
              <MsTextField
                label={f('idno')}
                value={alt.idno}
                onChange={(v) => updateAlt(index, { ...alt, idno: v })}
              />
            </div>
          </MsSubsection>
        ))}
        <MsAddButton
          label={f('altIdentifier')}
          onClick={() => set({ altIdentifiers: [...state.altIdentifiers, { idno: '' }] })}
        />
      </div>
    </div>
  );
}
