'use client';

import { useTranslations } from 'next-intl';

import type {
  MsDecoNote,
  MsDimensions,
  MsExtent,
  MsHandNote,
  MsMeasure,
  MsObjectDesc,
  MsSupportDesc,
  PhysDescState,
} from '@/lib/msdesc-form';
import {
  MsAddButton,
  MsOptionalSection,
  MsProseTextarea,
  MsRemoveButton,
  MsSubsection,
  MsTextField,
  MsVocabSelect,
} from './fields';

const opt = (value: string): string | undefined => (value === '' ? undefined : value);

/** physDesc area form (roadmap 2.2): the ODD container tree as typed fields. */
export function PhysDescForm({
  state,
  onChange,
}: {
  state: PhysDescState;
  onChange: (next: PhysDescState) => void;
}) {
  const t = useTranslations('backoffice');
  const f = (key: string) => t(`msdesc.render.fields.${key}`);
  const sec = (key: string) => t(`msdesc.render.sections.${key}`);

  const set = (patch: Partial<PhysDescState>) => onChange({ ...state, ...patch });
  const setObject = (patch: Partial<MsObjectDesc>) =>
    set({ objectDesc: { ...state.objectDesc, ...patch } });
  const setSupport = (patch: Partial<MsSupportDesc>) =>
    setObject({ supportDesc: { ...state.objectDesc.supportDesc, ...patch } });

  const supportDesc = state.objectDesc.supportDesc;
  const extent: MsExtent = supportDesc.extent ?? { measures: [], dimensions: [] };
  const setExtent = (next: MsExtent) =>
    setSupport({
      extent: next.measures.length === 0 && next.dimensions.length === 0 ? undefined : next,
    });
  const layout = state.objectDesc.layout;

  return (
    <div className="space-y-4">
      {/* objectDesc / supportDesc */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MsVocabSelect
          vocab="form"
          label={f('form')}
          value={state.objectDesc.form}
          onChange={(v) => setObject({ form: v })}
        />
        <MsVocabSelect
          vocab="material"
          label={f('support')}
          value={supportDesc.material}
          onChange={(v) => setSupport({ material: v })}
        />
        <MsTextField
          label={t('msdesc.form.supportMaterial')}
          value={supportDesc.support?.materialText ?? ''}
          onChange={(v) => setSupport({ support: v === '' ? undefined : { materialText: v } })}
        />
        <MsTextField
          label={f('foliation')}
          value={supportDesc.foliation ?? ''}
          onChange={(v) => setSupport({ foliation: opt(v) })}
        />
        <MsTextField
          label={f('condition')}
          value={supportDesc.condition ?? ''}
          onChange={(v) => setSupport({ condition: opt(v) })}
        />
      </div>
      <MsProseTextarea
        label={f('collation')}
        value={supportDesc.collationInnerXml ?? ''}
        onChange={(v) => setSupport({ collationInnerXml: opt(v) })}
      />

      {/* extent */}
      <MsSubsection title={f('extent')}>
        <div className="space-y-2">
          {extent.measures.map((measure, index) => (
            <MeasureRow
              key={index}
              measure={measure}
              onChange={(next) =>
                setExtent({
                  ...extent,
                  measures: extent.measures.map((m, i) => (i === index ? next : m)),
                })
              }
              onRemove={() =>
                setExtent({ ...extent, measures: extent.measures.filter((_, i) => i !== index) })
              }
            />
          ))}
          <MsAddButton
            label={f('measure')}
            onClick={() => setExtent({ ...extent, measures: [...extent.measures, { text: '' }] })}
          />
        </div>
        <div className="space-y-2">
          {extent.dimensions.map((dimensions, index) => (
            <DimensionsRow
              key={index}
              dimensions={dimensions}
              onChange={(next) =>
                setExtent({
                  ...extent,
                  dimensions: extent.dimensions.map((d, i) => (i === index ? next : d)),
                })
              }
              onRemove={() =>
                setExtent({
                  ...extent,
                  dimensions: extent.dimensions.filter((_, i) => i !== index),
                })
              }
            />
          ))}
          <MsAddButton
            label={f('dimensions')}
            onClick={() =>
              setExtent({
                ...extent,
                dimensions: [...extent.dimensions, { height: '', width: '' }],
              })
            }
          />
        </div>
      </MsSubsection>

      {/* layoutDesc/layout */}
      <MsOptionalSection
        title={sec('layoutDesc')}
        present={layout !== undefined}
        onAdd={() => setObject({ layout: { innerXml: '' } })}
        onRemove={() => setObject({ layout: undefined })}
      >
        {layout && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MsTextField
                label={f('columns')}
                value={layout.columns ?? ''}
                onChange={(v) => setObject({ layout: { ...layout, columns: opt(v) } })}
              />
              <MsTextField
                label={f('writtenLines')}
                value={layout.writtenLines ?? ''}
                onChange={(v) => setObject({ layout: { ...layout, writtenLines: opt(v) } })}
              />
              <MsTextField
                label={f('rulingMedium')}
                value={layout.rulingMedium ?? ''}
                onChange={(v) => setObject({ layout: { ...layout, rulingMedium: opt(v) } })}
                placeholder="leadpoint"
              />
              <MsVocabSelect
                vocab="topLine"
                label={f('topLine')}
                value={layout.topLine}
                onChange={(v) => setObject({ layout: { ...layout, topLine: v } })}
              />
            </div>
            <MsProseTextarea
              label={sec('layoutDesc')}
              value={layout.innerXml}
              onChange={(v) => setObject({ layout: { ...layout, innerXml: v } })}
            />
          </div>
        )}
      </MsOptionalSection>

      {/* handDesc */}
      <MsOptionalSection
        title={sec('handDesc')}
        present={state.handDesc !== undefined}
        onAdd={() => set({ handDesc: { handNotes: [{ innerXml: '' }] } })}
        onRemove={() => set({ handDesc: undefined })}
      >
        {state.handDesc && (
          <div className="space-y-2">
            <MsTextField
              label={f('hands')}
              value={state.handDesc.hands ?? ''}
              onChange={(v) => set({ handDesc: { ...state.handDesc!, hands: opt(v) } })}
              className="max-w-40"
            />
            {state.handDesc.handNotes.map((handNote, index) => (
              <HandNoteRow
                key={index}
                index={index}
                handNote={handNote}
                onChange={(next) =>
                  set({
                    handDesc: {
                      ...state.handDesc!,
                      handNotes: state.handDesc!.handNotes.map((h, i) => (i === index ? next : h)),
                    },
                  })
                }
                onRemove={() =>
                  set({
                    handDesc: {
                      ...state.handDesc!,
                      handNotes: state.handDesc!.handNotes.filter((_, i) => i !== index),
                    },
                  })
                }
              />
            ))}
            <MsAddButton
              label={f('hands')}
              onClick={() =>
                set({
                  handDesc: {
                    ...state.handDesc!,
                    handNotes: [...state.handDesc!.handNotes, { innerXml: '' }],
                  },
                })
              }
            />
          </div>
        )}
      </MsOptionalSection>

      {/* decoDesc */}
      <MsOptionalSection
        title={sec('decoDesc')}
        present={state.decoDesc !== undefined}
        onAdd={() => set({ decoDesc: { decoNotes: [{ innerXml: '' }] } })}
        onRemove={() => set({ decoDesc: undefined })}
      >
        {state.decoDesc && (
          <div className="space-y-2">
            <MsProseTextarea
              label={f('summary')}
              value={state.decoDesc.summaryInnerXml ?? ''}
              onChange={(v) => set({ decoDesc: { ...state.decoDesc!, summaryInnerXml: opt(v) } })}
            />
            {state.decoDesc.decoNotes.map((decoNote, index) => (
              <DecoNoteRow
                key={index}
                index={index}
                decoNote={decoNote}
                onChange={(next) =>
                  set({
                    decoDesc: {
                      ...state.decoDesc!,
                      decoNotes: state.decoDesc!.decoNotes.map((d, i) => (i === index ? next : d)),
                    },
                  })
                }
                onRemove={() =>
                  set({
                    decoDesc: {
                      ...state.decoDesc!,
                      decoNotes: state.decoDesc!.decoNotes.filter((_, i) => i !== index),
                    },
                  })
                }
              />
            ))}
            <MsAddButton
              label={sec('decoDesc')}
              onClick={() =>
                set({
                  decoDesc: {
                    ...state.decoDesc!,
                    decoNotes: [...state.decoDesc!.decoNotes, { innerXml: '' }],
                  },
                })
              }
            />
          </div>
        )}
      </MsOptionalSection>

      {/* additions */}
      <MsProseTextarea
        label={sec('additions')}
        value={state.additionsInnerXml ?? ''}
        onChange={(v) => set({ additionsInnerXml: opt(v) })}
      />

      {/* bindingDesc/binding */}
      <MsOptionalSection
        title={sec('bindingDesc')}
        present={state.binding !== undefined}
        onAdd={() => set({ binding: { innerXml: '' } })}
        onRemove={() => set({ binding: undefined })}
      >
        {state.binding && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <MsTextField
                label={t('msdesc.form.notBefore')}
                value={state.binding.notBefore ?? ''}
                onChange={(v) => set({ binding: { ...state.binding!, notBefore: opt(v) } })}
              />
              <MsTextField
                label={t('msdesc.form.notAfter')}
                value={state.binding.notAfter ?? ''}
                onChange={(v) => set({ binding: { ...state.binding!, notAfter: opt(v) } })}
              />
              <MsTextField
                label={t('msdesc.form.contemporary')}
                value={state.binding.contemporary ?? ''}
                onChange={(v) => set({ binding: { ...state.binding!, contemporary: opt(v) } })}
                placeholder="true"
              />
            </div>
            <MsProseTextarea
              label={sec('bindingDesc')}
              value={state.binding.innerXml}
              onChange={(v) => set({ binding: { ...state.binding!, innerXml: v } })}
            />
          </div>
        )}
      </MsOptionalSection>

      {/* accMat */}
      <MsProseTextarea
        label={f('accMat')}
        value={state.accMatInnerXml ?? ''}
        onChange={(v) => set({ accMatInnerXml: opt(v) })}
      />
    </div>
  );
}

function MeasureRow({
  measure,
  onChange,
  onRemove,
}: {
  measure: MsMeasure;
  onChange: (next: MsMeasure) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('backoffice');
  const f = (key: string) => t(`msdesc.render.fields.${key}`);
  return (
    <div className="flex items-end gap-3">
      <MsTextField
        label={f('type')}
        value={measure.type ?? ''}
        onChange={(v) => onChange({ ...measure, type: opt(v) })}
        className="w-28"
      />
      <MsTextField
        label={t('msdesc.form.quantity')}
        value={measure.quantity ?? ''}
        onChange={(v) => onChange({ ...measure, quantity: opt(v) })}
        className="w-24"
      />
      <MsTextField
        label={f('measure')}
        value={measure.text}
        onChange={(v) => onChange({ ...measure, text: v })}
        className="flex-1"
      />
      <MsRemoveButton label={f('measure')} onClick={onRemove} />
    </div>
  );
}

function DimensionsRow({
  dimensions,
  onChange,
  onRemove,
}: {
  dimensions: MsDimensions;
  onChange: (next: MsDimensions) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('backoffice');
  const f = (key: string) => t(`msdesc.render.fields.${key}`);
  return (
    <div className="flex items-end gap-3">
      <MsTextField
        label={f('type')}
        value={dimensions.type ?? ''}
        onChange={(v) => onChange({ ...dimensions, type: opt(v) })}
        className="w-28"
      />
      <MsTextField
        label={t('msdesc.form.height')}
        value={dimensions.height}
        onChange={(v) => onChange({ ...dimensions, height: v })}
        className="w-24"
      />
      <MsTextField
        label={t('msdesc.form.width')}
        value={dimensions.width}
        onChange={(v) => onChange({ ...dimensions, width: v })}
        className="w-24"
      />
      <MsTextField
        label={t('msdesc.form.unit')}
        value={dimensions.unit ?? ''}
        onChange={(v) => onChange({ ...dimensions, unit: opt(v) })}
        className="w-20"
        placeholder="mm"
      />
      <MsRemoveButton label={f('dimensions')} onClick={onRemove} />
    </div>
  );
}

function HandNoteRow({
  index,
  handNote,
  onChange,
  onRemove,
}: {
  index: number;
  handNote: MsHandNote;
  onChange: (next: MsHandNote) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('backoffice');
  const f = (key: string) => t(`msdesc.render.fields.${key}`);
  return (
    <MsSubsection title={`${f('hands')} ${index + 1}`} onRemove={onRemove}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MsVocabSelect
          vocab="script"
          label={f('script')}
          value={handNote.script}
          onChange={(v) => onChange({ ...handNote, script: v })}
        />
        <MsVocabSelect
          vocab="execution"
          label={f('execution')}
          value={handNote.execution}
          onChange={(v) => onChange({ ...handNote, execution: v })}
        />
        <MsTextField
          label={f('scope')}
          value={handNote.scope ?? ''}
          onChange={(v) => onChange({ ...handNote, scope: opt(v) })}
          placeholder="sole"
        />
        <MsTextField
          label={f('medium')}
          value={handNote.medium ?? ''}
          onChange={(v) => onChange({ ...handNote, medium: opt(v) })}
          placeholder="brown-ink"
        />
      </div>
      <MsProseTextarea
        label={f('note')}
        value={handNote.innerXml}
        onChange={(v) => onChange({ ...handNote, innerXml: v })}
      />
    </MsSubsection>
  );
}

function DecoNoteRow({
  index,
  decoNote,
  onChange,
  onRemove,
}: {
  index: number;
  decoNote: MsDecoNote;
  onChange: (next: MsDecoNote) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('backoffice');
  const f = (key: string) => t(`msdesc.render.fields.${key}`);
  return (
    <MsSubsection
      title={`${t('msdesc.render.sections.decoDesc')} ${index + 1}`}
      onRemove={onRemove}
    >
      <MsVocabSelect
        vocab="decoType"
        label={f('type')}
        value={decoNote.type}
        onChange={(v) => onChange({ ...decoNote, type: v })}
        className="max-w-64"
      />
      <MsProseTextarea
        label={f('note')}
        value={decoNote.innerXml}
        onChange={(v) => onChange({ ...decoNote, innerXml: v })}
      />
    </MsSubsection>
  );
}
