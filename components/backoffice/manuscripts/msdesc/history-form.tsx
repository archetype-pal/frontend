'use client';

import { useTranslations } from 'next-intl';

import type { HistoryState, MsKeyedText, MsOrigDate, MsOrigPlace } from '@/lib/msdesc-form';
import { MsAddButton, MsOptionalSection, MsSubsection, MsTextField } from './fields';
import { MsDescLeafEditor } from './msdesc-leaf-editor';

const opt = (value: string): string | undefined => (value === '' ? undefined : value);

function pruneKeyedText(next: MsKeyedText): MsKeyedText | undefined {
  return next.text === '' && next.key === undefined ? undefined : next;
}

function pruneOrigDate(next: MsOrigDate): MsOrigDate | undefined {
  const empty =
    next.text === '' &&
    next.calendar === undefined &&
    next.when === undefined &&
    next.notBefore === undefined &&
    next.notAfter === undefined;
  return empty ? undefined : next;
}

function pruneOrigPlace(next: MsOrigPlace): MsOrigPlace | undefined {
  const empty =
    next.country === undefined && next.region === undefined && next.settlement === undefined;
  return empty ? undefined : next;
}

/** history area form (roadmap 2.4): origin + provenance/acquisition prose. */
export function HistoryForm({
  state,
  onChange,
}: {
  state: HistoryState;
  onChange: (next: HistoryState) => void;
}) {
  const t = useTranslations('backoffice');
  const f = (key: string) => t(`msdesc.render.fields.${key}`);
  const set = (patch: Partial<HistoryState>) => onChange({ ...state, ...patch });

  const origin = state.origin;
  const origDate = origin?.origDate;
  const origPlace = origin?.origPlace;
  const acquisition = state.acquisition;

  const setOrigDate = (patch: Partial<MsOrigDate>) =>
    set({ origin: { ...origin, origDate: pruneOrigDate({ text: '', ...origDate, ...patch }) } });
  const setOrigPlaceField = (field: keyof MsOrigPlace, patch: Partial<MsKeyedText>) =>
    set({
      origin: {
        ...origin,
        origPlace: pruneOrigPlace({
          ...origPlace,
          [field]: pruneKeyedText({ text: '', ...origPlace?.[field], ...patch }),
        }),
      },
    });

  return (
    <div className="space-y-4">
      {/* origin */}
      <MsOptionalSection
        title={t('msdesc.render.sections.origin')}
        present={origin !== undefined}
        onAdd={() => set({ origin: {} })}
        onRemove={() => set({ origin: undefined })}
      >
        {origin && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <MsTextField
                label={f('origDate')}
                value={origDate?.text ?? ''}
                onChange={(v) => setOrigDate({ text: v })}
                placeholder="c. 1200"
              />
              <MsTextField
                label={t('msdesc.form.calendar')}
                value={origDate?.calendar ?? ''}
                onChange={(v) => setOrigDate({ calendar: opt(v) })}
                placeholder="#Gregorian"
              />
              <MsTextField
                label={t('msdesc.form.when')}
                value={origDate?.when ?? ''}
                onChange={(v) => setOrigDate({ when: opt(v) })}
              />
              <MsTextField
                label={t('msdesc.form.notBefore')}
                value={origDate?.notBefore ?? ''}
                onChange={(v) => setOrigDate({ notBefore: opt(v) })}
              />
              <MsTextField
                label={t('msdesc.form.notAfter')}
                value={origDate?.notAfter ?? ''}
                onChange={(v) => setOrigDate({ notAfter: opt(v) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {(['country', 'region', 'settlement'] as const).map((field) => (
                <div key={field} className="space-y-2">
                  <MsTextField
                    label={`${f('origPlace')} — ${f(field)}`}
                    value={origPlace?.[field]?.text ?? ''}
                    onChange={(v) => setOrigPlaceField(field, { text: v })}
                  />
                  <MsTextField
                    label={t('msdesc.form.key')}
                    value={origPlace?.[field]?.key ?? ''}
                    onChange={(v) => setOrigPlaceField(field, { key: opt(v) })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </MsOptionalSection>

      {/* provenance list */}
      <div className="space-y-2">
        {state.provenances.map((provenance, index) => (
          <MsSubsection
            key={index}
            title={`${f('provenance')} ${index + 1}`}
            onRemove={() => set({ provenances: state.provenances.filter((_, i) => i !== index) })}
          >
            <div className="grid grid-cols-2 gap-3">
              <MsTextField
                label={t('msdesc.form.when')}
                value={provenance.when ?? ''}
                onChange={(v) =>
                  set({
                    provenances: state.provenances.map((p, i) =>
                      i === index ? { ...p, when: opt(v) } : p
                    ),
                  })
                }
              />
              <MsTextField
                label={t('msdesc.form.notAfter')}
                value={provenance.notAfter ?? ''}
                onChange={(v) =>
                  set({
                    provenances: state.provenances.map((p, i) =>
                      i === index ? { ...p, notAfter: opt(v) } : p
                    ),
                  })
                }
              />
            </div>
            <MsDescLeafEditor
              label={f('provenance')}
              value={provenance.innerXml}
              onChange={(v) =>
                set({
                  provenances: state.provenances.map((p, i) =>
                    i === index ? { ...p, innerXml: v } : p
                  ),
                })
              }
            />
          </MsSubsection>
        ))}
        <MsAddButton
          label={f('provenance')}
          onClick={() => set({ provenances: [...state.provenances, { innerXml: '' }] })}
        />
      </div>

      {/* acquisition */}
      <MsOptionalSection
        title={f('acquisition')}
        present={acquisition !== undefined}
        onAdd={() => set({ acquisition: { innerXml: '' } })}
        onRemove={() => set({ acquisition: undefined })}
      >
        {acquisition && (
          <div className="space-y-3">
            <MsTextField
              label={t('msdesc.form.when')}
              value={acquisition.when ?? ''}
              onChange={(v) => set({ acquisition: { ...acquisition, when: opt(v) } })}
              className="max-w-48"
            />
            <MsDescLeafEditor
              label={f('acquisition')}
              value={acquisition.innerXml}
              onChange={(v) => set({ acquisition: { ...acquisition, innerXml: v } })}
            />
          </div>
        )}
      </MsOptionalSection>
    </div>
  );
}
