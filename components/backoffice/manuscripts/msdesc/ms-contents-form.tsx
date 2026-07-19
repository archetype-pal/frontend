'use client';

import { useTranslations } from 'next-intl';

import type { MsContentsState, MsItemState, MsKeyedText, MsTextLang } from '@/lib/msdesc-form';
import { MsAddButton, MsSubsection, MsTextField } from './fields';
import { MsDescLeafEditor } from './msdesc-leaf-editor';

const opt = (value: string): string | undefined => (value === '' ? undefined : value);

/** `{key?, text}` phrase leaf — pruned to absent when both parts are empty. */
function pruneKeyedText(next: MsKeyedText): MsKeyedText | undefined {
  return next.text === '' && next.key === undefined ? undefined : next;
}

function pruneTextLang(next: MsTextLang): MsTextLang | undefined {
  return next.text === '' && next.mainLang === undefined ? undefined : next;
}

/** msContents area form (roadmap 2.4): summary + language + msItem skeletons. */
export function MsContentsForm({
  state,
  onChange,
}: {
  state: MsContentsState;
  onChange: (next: MsContentsState) => void;
}) {
  const t = useTranslations('backoffice');
  const f = (key: string) => t(`msdesc.render.fields.${key}`);
  const set = (patch: Partial<MsContentsState>) => onChange({ ...state, ...patch });

  const updateItem = (index: number, next: MsItemState) =>
    set({ msItems: state.msItems.map((item, i) => (i === index ? next : item)) });

  return (
    <div className="space-y-4">
      <MsDescLeafEditor
        label={f('summary')}
        value={state.summaryInnerXml ?? ''}
        onChange={(v) => set({ summaryInnerXml: opt(v) })}
      />

      <div className="grid grid-cols-2 gap-3">
        <MsTextField
          label={f('textLang')}
          value={state.textLang?.text ?? ''}
          onChange={(v) =>
            set({ textLang: pruneTextLang({ mainLang: state.textLang?.mainLang, text: v }) })
          }
        />
        <MsTextField
          label={t('msdesc.form.mainLang')}
          value={state.textLang?.mainLang ?? ''}
          onChange={(v) =>
            set({ textLang: pruneTextLang({ mainLang: opt(v), text: state.textLang?.text ?? '' }) })
          }
        />
      </div>

      <div className="space-y-2">
        {state.msItems.map((item, index) => (
          <MsSubsection
            key={index}
            title={`${t('msdesc.render.sections.msItem')} ${item.n ?? index + 1}`}
            onRemove={() => set({ msItems: state.msItems.filter((_, i) => i !== index) })}
          >
            <MsItemForm item={item} onChange={(next) => updateItem(index, next)} />
          </MsSubsection>
        ))}
        <MsAddButton
          label={t('msdesc.render.sections.msItem')}
          onClick={() => set({ msItems: [...state.msItems, {}] })}
        />
      </div>
    </div>
  );
}

function MsItemForm({
  item,
  onChange,
}: {
  item: MsItemState;
  onChange: (next: MsItemState) => void;
}) {
  const t = useTranslations('backoffice');
  const f = (key: string) => t(`msdesc.render.fields.${key}`);
  const set = (patch: Partial<MsItemState>) => onChange({ ...item, ...patch });

  const setLocus = (patch: Partial<NonNullable<MsItemState['locus']>>) => {
    const next = { text: '', ...item.locus, ...patch };
    const empty = next.text === '' && next.from === undefined && next.to === undefined;
    set({ locus: empty ? undefined : next });
  };
  const setKeyed = (field: 'author' | 'title', patch: Partial<MsKeyedText>) =>
    set({ [field]: pruneKeyedText({ text: '', ...item[field], ...patch }) });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MsTextField
          label={t('msdesc.form.number')}
          value={item.n ?? ''}
          onChange={(v) => set({ n: opt(v) })}
        />
        <MsTextField
          label={f('locus')}
          value={item.locus?.text ?? ''}
          onChange={(v) => setLocus({ text: v })}
        />
        <MsTextField
          label={`${f('locus')} — ${t('msdesc.form.from')}`}
          value={item.locus?.from ?? ''}
          onChange={(v) => setLocus({ from: opt(v) })}
          placeholder="1r"
        />
        <MsTextField
          label={`${f('locus')} — ${t('msdesc.form.to')}`}
          value={item.locus?.to ?? ''}
          onChange={(v) => setLocus({ to: opt(v) })}
          placeholder="12v"
        />
        <MsTextField
          label={f('author')}
          value={item.author?.text ?? ''}
          onChange={(v) => setKeyed('author', { text: v })}
        />
        <MsTextField
          label={`${f('author')} — ${t('msdesc.form.key')}`}
          value={item.author?.key ?? ''}
          onChange={(v) => setKeyed('author', { key: opt(v) })}
          placeholder="person_12"
        />
        <MsTextField
          label={f('title')}
          value={item.title?.text ?? ''}
          onChange={(v) => setKeyed('title', { text: v })}
        />
        <MsTextField
          label={`${f('title')} — ${t('msdesc.form.key')}`}
          value={item.title?.key ?? ''}
          onChange={(v) => setKeyed('title', { key: opt(v) })}
          placeholder="work_790"
        />
        <MsTextField
          label={f('textLang')}
          value={item.textLang?.text ?? ''}
          onChange={(v) =>
            set({ textLang: pruneTextLang({ mainLang: item.textLang?.mainLang, text: v }) })
          }
        />
        <MsTextField
          label={t('msdesc.form.mainLang')}
          value={item.textLang?.mainLang ?? ''}
          onChange={(v) =>
            set({ textLang: pruneTextLang({ mainLang: opt(v), text: item.textLang?.text ?? '' }) })
          }
        />
        <MsTextField
          label={f('rubric')}
          value={item.rubric ?? ''}
          onChange={(v) => set({ rubric: opt(v) })}
        />
        <MsTextField
          label={f('incipit')}
          value={item.incipit ?? ''}
          onChange={(v) => set({ incipit: opt(v) })}
        />
        <MsTextField
          label={f('explicit')}
          value={item.explicit ?? ''}
          onChange={(v) => set({ explicit: opt(v) })}
        />
        <MsTextField
          label={f('finalRubric')}
          value={item.finalRubric ?? ''}
          onChange={(v) => set({ finalRubric: opt(v) })}
        />
      </div>
      <MsDescLeafEditor
        label={f('note')}
        value={item.noteInnerXml ?? ''}
        onChange={(v) => set({ noteInnerXml: opt(v) })}
      />
    </div>
  );
}
