/**
 * msDesc typed form-state models (TEI descriptions roadmap 2.2 serializer
 * core) — one state shape per description area plus mutually inverse
 * `fromFragment` / `toFragment` pairs, modelled on the structures in
 * `msdesc-minimal/msdesc-minimal-template.xml`.
 *
 * Data-safety contract (roadmap 2.2/2.2b/3.1): `fromFragment` either returns
 * `{ ok: true, state }` — the fragment is fully representable and
 * `toFragment(state)` re-serializes it canonically with no information loss —
 * or `{ ok: false, reason }`, in which case the caller must keep the stored
 * string untouched and edit via the Source tab. Unknown elements, unknown
 * attributes, out-of-vocabulary closed-list values and structural surprises
 * are always rejections, never silent drops.
 *
 * Field conventions:
 *   - `…InnerXml` / `innerXml` fields hold a prose leaf's inner `<p>`-sequence
 *     as a **verbatim** XML string (byte-exact from the source; the Phase-3
 *     rich editor edits these same strings). '' means present-but-empty;
 *     undefined means the element is absent.
 *   - Plain string fields hold decoded, whitespace-trimmed text; numbers and
 *     dates stay strings because XML attributes are strings and a numeric
 *     parse would be lossy ("8-1", "c. 1400").
 *   - Closed vocabularies (`objectDesc/@form`, `supportDesc/@material`,
 *     `layout/@topLine`, `handNote/@script`/`@execution`, `decoNote/@type`)
 *     are typed via `lib/msdesc-vocab.ts` unions; values outside them make the
 *     fragment unrepresentable (the §8.5 structural-conformance win).
 *
 * Reason strings are diagnostic (dev/log surfaces), not user-facing copy.
 */

import type { XmlElementNode, BuildNode, ElementShape } from '@/lib/msdesc-fragments';
import {
  attrValue,
  checkShape,
  childElements,
  el,
  elementText,
  innerXml,
  parseFragment,
  raw,
  serializeFragment,
  text,
} from '@/lib/msdesc-fragments';
import type {
  DecoNoteType,
  HandExecution,
  HandScript,
  LayoutTopLine,
  MsDescAreaId,
  ObjectDescForm,
  SupportMaterial,
} from '@/lib/msdesc-vocab';
import {
  DECO_NOTE_TYPES,
  HAND_EXECUTIONS,
  HAND_SCRIPTS,
  LAYOUT_TOP_LINES,
  OBJECT_DESC_FORMS,
  SUPPORT_MATERIALS,
} from '@/lib/msdesc-vocab';

export type FromFragmentResult<S> = { ok: true; state: S } | { ok: false; reason: string };

// ── msIdentifier ────────────────────────────────────────────────────────

export interface MsAltIdentifier {
  /** `altIdentifier/@type` (e.g. "internal", "former"). */
  type?: string;
  /** `idno/@type` inside the altIdentifier (e.g. "SCN"). */
  idnoType?: string;
  idno: string;
}

export interface MsIdentifierState {
  country: string;
  settlement: string;
  institution: string;
  repository: string;
  /** Text of `<idno type="shelfmark">`. */
  shelfmark: string;
  msName?: string;
  altIdentifiers: MsAltIdentifier[];
}

// ── msContents ──────────────────────────────────────────────────────────

export interface MsTextLang {
  mainLang?: string;
  text: string;
}

export interface MsLocus {
  from?: string;
  to?: string;
  text: string;
}

/** A phrase leaf carrying an authority `@key` (author, title). */
export interface MsKeyedText {
  key?: string;
  text: string;
}

export interface MsItemState {
  n?: string;
  xmlId?: string;
  locus?: MsLocus;
  author?: MsKeyedText;
  title?: MsKeyedText;
  textLang?: MsTextLang;
  rubric?: string;
  incipit?: string;
  explicit?: string;
  finalRubric?: string;
  noteInnerXml?: string;
}

export interface MsContentsState {
  summaryInnerXml?: string;
  textLang?: MsTextLang;
  msItems: MsItemState[];
}

// ── physDesc ────────────────────────────────────────────────────────────

export interface MsMeasure {
  type?: string;
  quantity?: string;
  text: string;
}

export interface MsDimensions {
  type?: string;
  unit?: string;
  height: string;
  width: string;
}

export interface MsExtent {
  measures: MsMeasure[];
  dimensions: MsDimensions[];
}

export interface MsSupportDesc {
  material?: SupportMaterial;
  /** `<support><material>…</material></support>`; undefined = no <support>. */
  support?: { materialText?: string };
  extent?: MsExtent;
  foliation?: string;
  collationInnerXml?: string;
  condition?: string;
}

export interface MsLayout {
  columns?: string;
  writtenLines?: string;
  rulingMedium?: string;
  topLine?: LayoutTopLine;
  innerXml: string;
}

export interface MsObjectDesc {
  form?: ObjectDescForm;
  supportDesc: MsSupportDesc;
  /** Serialized inside a `<layoutDesc>` wrapper. */
  layout?: MsLayout;
}

export interface MsHandNote {
  xmlId?: string;
  script?: HandScript;
  execution?: HandExecution;
  scope?: string;
  medium?: string;
  innerXml: string;
}

export interface MsHandDesc {
  hands?: string;
  handNotes: MsHandNote[];
}

export interface MsDecoNote {
  type?: DecoNoteType;
  innerXml: string;
}

export interface MsDecoDesc {
  summaryInnerXml?: string;
  decoNotes: MsDecoNote[];
}

export interface MsBinding {
  notBefore?: string;
  notAfter?: string;
  contemporary?: string;
  innerXml: string;
}

export interface PhysDescState {
  objectDesc: MsObjectDesc;
  handDesc?: MsHandDesc;
  decoDesc?: MsDecoDesc;
  additionsInnerXml?: string;
  /** Serialized inside a `<bindingDesc>` wrapper. */
  binding?: MsBinding;
  accMatInnerXml?: string;
}

// ── history ─────────────────────────────────────────────────────────────

export interface MsOrigDate {
  calendar?: string;
  notBefore?: string;
  notAfter?: string;
  when?: string;
  text: string;
}

export interface MsOrigPlace {
  country?: MsKeyedText;
  region?: MsKeyedText;
  settlement?: MsKeyedText;
}

export interface MsProvenance {
  notAfter?: string;
  when?: string;
  innerXml: string;
}

export interface HistoryState {
  origin?: { origDate?: MsOrigDate; origPlace?: MsOrigPlace };
  provenances: MsProvenance[];
  acquisition?: { when?: string; innerXml: string };
}

// ── Area shapes (representability gate) ─────────────────────────────────

const TEXT: ElementShape = { content: 'text' };
const KEYED_TEXT: ElementShape = { content: 'text', attrs: ['key'] };
const TEXT_LANG: ElementShape = { content: 'text', attrs: ['mainLang'] };

const MS_IDENTIFIER_SHAPE: ElementShape = {
  content: 'elements',
  children: {
    country: TEXT,
    settlement: TEXT,
    institution: TEXT,
    repository: TEXT,
    idno: { content: 'text', attrs: ['type'] },
    msName: TEXT,
    altIdentifier: {
      content: 'elements',
      attrs: ['type'],
      children: { idno: { content: 'text', attrs: ['type'] } },
    },
  },
};

const MS_CONTENTS_SHAPE: ElementShape = {
  content: 'elements',
  children: {
    summary: { content: 'inner-xml' },
    textLang: TEXT_LANG,
    msItem: {
      content: 'elements',
      attrs: ['n', 'xml:id'],
      children: {
        locus: { content: 'text', attrs: ['from', 'to'] },
        author: KEYED_TEXT,
        title: KEYED_TEXT,
        textLang: TEXT_LANG,
        rubric: TEXT,
        incipit: TEXT,
        explicit: TEXT,
        finalRubric: TEXT,
        note: { content: 'inner-xml' },
      },
    },
  },
};

const PHYS_DESC_SHAPE: ElementShape = {
  content: 'elements',
  children: {
    objectDesc: {
      content: 'elements',
      attrs: ['form'],
      children: {
        supportDesc: {
          content: 'elements',
          attrs: ['material'],
          children: {
            support: { content: 'elements', children: { material: TEXT } },
            extent: {
              content: 'elements',
              children: {
                measure: { content: 'text', attrs: ['type', 'quantity'] },
                dimensions: {
                  content: 'elements',
                  attrs: ['type', 'unit'],
                  children: { height: TEXT, width: TEXT },
                },
              },
            },
            foliation: TEXT,
            collation: { content: 'inner-xml' },
            condition: TEXT,
          },
        },
        layoutDesc: {
          content: 'elements',
          children: {
            layout: {
              content: 'inner-xml',
              attrs: ['columns', 'writtenLines', 'rulingMedium', 'topLine'],
            },
          },
        },
      },
    },
    handDesc: {
      content: 'elements',
      attrs: ['hands'],
      children: {
        handNote: {
          content: 'inner-xml',
          attrs: ['xml:id', 'script', 'execution', 'scope', 'medium'],
        },
      },
    },
    decoDesc: {
      content: 'elements',
      children: {
        summary: { content: 'inner-xml' },
        decoNote: { content: 'inner-xml', attrs: ['type'] },
      },
    },
    additions: { content: 'inner-xml' },
    bindingDesc: {
      content: 'elements',
      children: {
        binding: { content: 'inner-xml', attrs: ['notBefore', 'notAfter', 'contemporary'] },
      },
    },
    accMat: { content: 'inner-xml' },
  },
};

const HISTORY_SHAPE: ElementShape = {
  content: 'elements',
  children: {
    origin: {
      content: 'elements',
      children: {
        origDate: { content: 'text', attrs: ['calendar', 'notBefore', 'notAfter', 'when'] },
        origPlace: {
          content: 'elements',
          children: { country: KEYED_TEXT, region: KEYED_TEXT, settlement: KEYED_TEXT },
        },
      },
    },
    provenance: { content: 'inner-xml', attrs: ['notAfter', 'when'] },
    acquisition: { content: 'inner-xml', attrs: ['when'] },
  },
};

export const MSDESC_AREA_SHAPES: Record<MsDescAreaId, ElementShape> = {
  msIdentifier: MS_IDENTIFIER_SHAPE,
  msContents: MS_CONTENTS_SHAPE,
  physDesc: PHYS_DESC_SHAPE,
  history: HISTORY_SHAPE,
};

// ── Extraction helpers ──────────────────────────────────────────────────

class Unrepresentable extends Error {}

function fail(reason: string): never {
  throw new Unrepresentable(reason);
}

/** The single child element of the given name; more than one is a rejection. */
function single(parent: XmlElementNode, name: string): XmlElementNode | undefined {
  const found = childElements(parent).filter((c) => c.name === name);
  if (found.length > 1) fail(`<${parent.name}> contains more than one <${name}>`);
  return found[0];
}

function list(parent: XmlElementNode, name: string): XmlElementNode[] {
  return childElements(parent).filter((c) => c.name === name);
}

/** Trimmed decoded text of a text leaf (shape-checked upstream). */
function textOf(element: XmlElementNode): string {
  const value = elementText(element);
  if (value === null) fail(`<${element.name}> contains unexpected child elements`);
  return value.trim();
}

/** A closed-vocabulary attribute; out-of-vocabulary values are rejections. */
function vocabAttr<T extends string>(
  element: XmlElementNode,
  name: string,
  values: readonly T[]
): T | undefined {
  const value = attrValue(element, name);
  if (value === undefined) return undefined;
  if (!(values as readonly string[]).includes(value)) {
    fail(`unsupported ${name}="${value}" on <${element.name}>`);
  }
  return value as T;
}

function parseArea(area: MsDescAreaId, fragment: string): { root: XmlElementNode; source: string } {
  const parsed = parseFragment(fragment);
  if (!parsed.ok) fail(parsed.error);
  if (parsed.root.name !== area) {
    fail(`expected a <${area}> fragment, got <${parsed.root.name}>`);
  }
  const shaped = checkShape(parsed.root, MSDESC_AREA_SHAPES[area]);
  if (!shaped.ok) fail(shaped.reason);
  return { root: parsed.root, source: parsed.source };
}

function runFromFragment<S>(build: () => S): FromFragmentResult<S> {
  try {
    return { ok: true, state: build() };
  } catch (error) {
    if (error instanceof Unrepresentable) return { ok: false, reason: error.message };
    throw error;
  }
}

// ── Serialization helpers ───────────────────────────────────────────────

type AttrPairs = ReadonlyArray<readonly [string, string | undefined]>;

/** `<name>trimmed text</name>`, self-closed when the text is empty. */
function textLeaf(name: string, attrs: AttrPairs, value: string): BuildNode {
  const trimmed = value.trim();
  return el(name, attrs, trimmed === '' ? [] : [text(trimmed)]);
}

/** A verbatim prose leaf: inner XML spliced back exactly as stored. */
function proseLeaf(name: string, attrs: AttrPairs, inner: string): BuildNode {
  return el(name, attrs, inner === '' ? [] : [raw(inner)]);
}

// ── msIdentifier from/to ────────────────────────────────────────────────

export function msIdentifierFromFragment(fragment: string): FromFragmentResult<MsIdentifierState> {
  return runFromFragment(() => {
    const { root } = parseArea('msIdentifier', fragment);
    const textOfSingle = (name: string): string => {
      const found = single(root, name);
      return found ? textOf(found) : '';
    };
    const idno = single(root, 'idno');
    if (idno) {
      const type = attrValue(idno, 'type');
      if (type !== undefined && type !== 'shelfmark') {
        fail(`unsupported idno type="${type}" in <msIdentifier>`);
      }
    }
    const msName = single(root, 'msName');
    return {
      country: textOfSingle('country'),
      settlement: textOfSingle('settlement'),
      institution: textOfSingle('institution'),
      repository: textOfSingle('repository'),
      shelfmark: idno ? textOf(idno) : '',
      msName: msName ? textOf(msName) : undefined,
      altIdentifiers: list(root, 'altIdentifier').map((alt) => {
        const altIdno = single(alt, 'idno');
        return {
          type: attrValue(alt, 'type'),
          idnoType: altIdno ? attrValue(altIdno, 'type') : undefined,
          idno: altIdno ? textOf(altIdno) : '',
        };
      }),
    };
  });
}

export function msIdentifierToFragment(state: MsIdentifierState): string {
  return serializeFragment(
    el(
      'msIdentifier',
      [],
      [
        textLeaf('country', [], state.country),
        textLeaf('settlement', [], state.settlement),
        textLeaf('institution', [], state.institution),
        textLeaf('repository', [], state.repository),
        textLeaf('idno', [['type', 'shelfmark']], state.shelfmark),
        ...(state.msName === undefined ? [] : [textLeaf('msName', [], state.msName)]),
        ...state.altIdentifiers.map((alt) =>
          el(
            'altIdentifier',
            [['type', alt.type]],
            [textLeaf('idno', [['type', alt.idnoType]], alt.idno)]
          )
        ),
      ]
    )
  );
}

// ── msContents from/to ──────────────────────────────────────────────────

function extractTextLang(element: XmlElementNode | undefined): MsTextLang | undefined {
  if (!element) return undefined;
  return { mainLang: attrValue(element, 'mainLang'), text: textOf(element) };
}

function extractKeyedText(element: XmlElementNode | undefined): MsKeyedText | undefined {
  if (!element) return undefined;
  return { key: attrValue(element, 'key'), text: textOf(element) };
}

export function msContentsFromFragment(fragment: string): FromFragmentResult<MsContentsState> {
  return runFromFragment(() => {
    const { root, source } = parseArea('msContents', fragment);
    const summary = single(root, 'summary');
    const optionalText = (parent: XmlElementNode, name: string): string | undefined => {
      const found = single(parent, name);
      return found ? textOf(found) : undefined;
    };
    return {
      summaryInnerXml: summary ? innerXml(source, summary) : undefined,
      textLang: extractTextLang(single(root, 'textLang')),
      msItems: list(root, 'msItem').map((item) => {
        const locus = single(item, 'locus');
        const note = single(item, 'note');
        return {
          n: attrValue(item, 'n'),
          xmlId: attrValue(item, 'xml:id'),
          locus: locus
            ? { from: attrValue(locus, 'from'), to: attrValue(locus, 'to'), text: textOf(locus) }
            : undefined,
          author: extractKeyedText(single(item, 'author')),
          title: extractKeyedText(single(item, 'title')),
          textLang: extractTextLang(single(item, 'textLang')),
          rubric: optionalText(item, 'rubric'),
          incipit: optionalText(item, 'incipit'),
          explicit: optionalText(item, 'explicit'),
          finalRubric: optionalText(item, 'finalRubric'),
          noteInnerXml: note ? innerXml(source, note) : undefined,
        };
      }),
    };
  });
}

function buildTextLang(textLang: MsTextLang): BuildNode {
  return textLeaf('textLang', [['mainLang', textLang.mainLang]], textLang.text);
}

export function msContentsToFragment(state: MsContentsState): string {
  return serializeFragment(
    el(
      'msContents',
      [],
      [
        ...(state.summaryInnerXml === undefined
          ? []
          : [proseLeaf('summary', [], state.summaryInnerXml)]),
        ...(state.textLang === undefined ? [] : [buildTextLang(state.textLang)]),
        ...state.msItems.map((item) =>
          el(
            'msItem',
            [
              ['n', item.n],
              ['xml:id', item.xmlId],
            ],
            [
              ...(item.locus === undefined
                ? []
                : [
                    textLeaf(
                      'locus',
                      [
                        ['from', item.locus.from],
                        ['to', item.locus.to],
                      ],
                      item.locus.text
                    ),
                  ]),
              ...(item.author === undefined
                ? []
                : [textLeaf('author', [['key', item.author.key]], item.author.text)]),
              ...(item.title === undefined
                ? []
                : [textLeaf('title', [['key', item.title.key]], item.title.text)]),
              ...(item.textLang === undefined ? [] : [buildTextLang(item.textLang)]),
              ...(item.rubric === undefined ? [] : [textLeaf('rubric', [], item.rubric)]),
              ...(item.incipit === undefined ? [] : [textLeaf('incipit', [], item.incipit)]),
              ...(item.explicit === undefined ? [] : [textLeaf('explicit', [], item.explicit)]),
              ...(item.finalRubric === undefined
                ? []
                : [textLeaf('finalRubric', [], item.finalRubric)]),
              ...(item.noteInnerXml === undefined
                ? []
                : [proseLeaf('note', [], item.noteInnerXml)]),
            ]
          )
        ),
      ]
    )
  );
}

// ── physDesc from/to ────────────────────────────────────────────────────

function extractSupportDesc(element: XmlElementNode | undefined, source: string): MsSupportDesc {
  if (!element) return {};
  const support = single(element, 'support');
  const supportMaterial = support ? single(support, 'material') : undefined;
  const extent = single(element, 'extent');
  const foliation = single(element, 'foliation');
  const collation = single(element, 'collation');
  const condition = single(element, 'condition');
  return {
    material: vocabAttr(element, 'material', SUPPORT_MATERIALS),
    support: support
      ? { materialText: supportMaterial ? textOf(supportMaterial) : undefined }
      : undefined,
    extent: extent
      ? {
          measures: list(extent, 'measure').map((measure) => ({
            type: attrValue(measure, 'type'),
            quantity: attrValue(measure, 'quantity'),
            text: textOf(measure),
          })),
          dimensions: list(extent, 'dimensions').map((dimensions) => {
            const height = single(dimensions, 'height');
            const width = single(dimensions, 'width');
            return {
              type: attrValue(dimensions, 'type'),
              unit: attrValue(dimensions, 'unit'),
              height: height ? textOf(height) : '',
              width: width ? textOf(width) : '',
            };
          }),
        }
      : undefined,
    foliation: foliation ? textOf(foliation) : undefined,
    collationInnerXml: collation ? innerXml(source, collation) : undefined,
    condition: condition ? textOf(condition) : undefined,
  };
}

export function physDescFromFragment(fragment: string): FromFragmentResult<PhysDescState> {
  return runFromFragment(() => {
    const { root, source } = parseArea('physDesc', fragment);
    const objectDesc = single(root, 'objectDesc');
    const layoutDesc = objectDesc ? single(objectDesc, 'layoutDesc') : undefined;
    const layout = layoutDesc ? single(layoutDesc, 'layout') : undefined;
    const handDesc = single(root, 'handDesc');
    const decoDesc = single(root, 'decoDesc');
    const decoSummary = decoDesc ? single(decoDesc, 'summary') : undefined;
    const additions = single(root, 'additions');
    const bindingDesc = single(root, 'bindingDesc');
    const binding = bindingDesc ? single(bindingDesc, 'binding') : undefined;
    const accMat = single(root, 'accMat');
    return {
      objectDesc: {
        form: objectDesc ? vocabAttr(objectDesc, 'form', OBJECT_DESC_FORMS) : undefined,
        supportDesc: extractSupportDesc(
          objectDesc ? single(objectDesc, 'supportDesc') : undefined,
          source
        ),
        layout: layout
          ? {
              columns: attrValue(layout, 'columns'),
              writtenLines: attrValue(layout, 'writtenLines'),
              rulingMedium: attrValue(layout, 'rulingMedium'),
              topLine: vocabAttr(layout, 'topLine', LAYOUT_TOP_LINES),
              innerXml: innerXml(source, layout),
            }
          : undefined,
      },
      handDesc: handDesc
        ? {
            hands: attrValue(handDesc, 'hands'),
            handNotes: list(handDesc, 'handNote').map((handNote) => ({
              xmlId: attrValue(handNote, 'xml:id'),
              script: vocabAttr(handNote, 'script', HAND_SCRIPTS),
              execution: vocabAttr(handNote, 'execution', HAND_EXECUTIONS),
              scope: attrValue(handNote, 'scope'),
              medium: attrValue(handNote, 'medium'),
              innerXml: innerXml(source, handNote),
            })),
          }
        : undefined,
      decoDesc: decoDesc
        ? {
            summaryInnerXml: decoSummary ? innerXml(source, decoSummary) : undefined,
            decoNotes: list(decoDesc, 'decoNote').map((decoNote) => ({
              type: vocabAttr(decoNote, 'type', DECO_NOTE_TYPES),
              innerXml: innerXml(source, decoNote),
            })),
          }
        : undefined,
      additionsInnerXml: additions ? innerXml(source, additions) : undefined,
      binding: binding
        ? {
            notBefore: attrValue(binding, 'notBefore'),
            notAfter: attrValue(binding, 'notAfter'),
            contemporary: attrValue(binding, 'contemporary'),
            innerXml: innerXml(source, binding),
          }
        : undefined,
      accMatInnerXml: accMat ? innerXml(source, accMat) : undefined,
    };
  });
}

function buildSupportDesc(supportDesc: MsSupportDesc): BuildNode {
  const children: BuildNode[] = [];
  if (supportDesc.support !== undefined) {
    children.push(
      el(
        'support',
        [],
        supportDesc.support.materialText === undefined
          ? []
          : [textLeaf('material', [], supportDesc.support.materialText)]
      )
    );
  }
  if (supportDesc.extent !== undefined) {
    children.push(
      el(
        'extent',
        [],
        [
          ...supportDesc.extent.measures.map((measure) =>
            textLeaf(
              'measure',
              [
                ['type', measure.type],
                ['quantity', measure.quantity],
              ],
              measure.text
            )
          ),
          ...supportDesc.extent.dimensions.map((dimensions) =>
            el(
              'dimensions',
              [
                ['type', dimensions.type],
                ['unit', dimensions.unit],
              ],
              [textLeaf('height', [], dimensions.height), textLeaf('width', [], dimensions.width)]
            )
          ),
        ]
      )
    );
  }
  if (supportDesc.foliation !== undefined) {
    children.push(textLeaf('foliation', [], supportDesc.foliation));
  }
  if (supportDesc.collationInnerXml !== undefined) {
    children.push(proseLeaf('collation', [], supportDesc.collationInnerXml));
  }
  if (supportDesc.condition !== undefined) {
    children.push(textLeaf('condition', [], supportDesc.condition));
  }
  return el('supportDesc', [['material', supportDesc.material]], children);
}

export function physDescToFragment(state: PhysDescState): string {
  const objectDescChildren: BuildNode[] = [buildSupportDesc(state.objectDesc.supportDesc)];
  if (state.objectDesc.layout !== undefined) {
    const layout = state.objectDesc.layout;
    objectDescChildren.push(
      el(
        'layoutDesc',
        [],
        [
          proseLeaf(
            'layout',
            [
              ['columns', layout.columns],
              ['writtenLines', layout.writtenLines],
              ['rulingMedium', layout.rulingMedium],
              ['topLine', layout.topLine],
            ],
            layout.innerXml
          ),
        ]
      )
    );
  }
  const children: BuildNode[] = [
    el('objectDesc', [['form', state.objectDesc.form]], objectDescChildren),
  ];
  if (state.handDesc !== undefined) {
    children.push(
      el(
        'handDesc',
        [['hands', state.handDesc.hands]],
        state.handDesc.handNotes.map((handNote) =>
          proseLeaf(
            'handNote',
            [
              ['xml:id', handNote.xmlId],
              ['script', handNote.script],
              ['execution', handNote.execution],
              ['scope', handNote.scope],
              ['medium', handNote.medium],
            ],
            handNote.innerXml
          )
        )
      )
    );
  }
  if (state.decoDesc !== undefined) {
    children.push(
      el(
        'decoDesc',
        [],
        [
          ...(state.decoDesc.summaryInnerXml === undefined
            ? []
            : [proseLeaf('summary', [], state.decoDesc.summaryInnerXml)]),
          ...state.decoDesc.decoNotes.map((decoNote) =>
            proseLeaf('decoNote', [['type', decoNote.type]], decoNote.innerXml)
          ),
        ]
      )
    );
  }
  if (state.additionsInnerXml !== undefined) {
    children.push(proseLeaf('additions', [], state.additionsInnerXml));
  }
  if (state.binding !== undefined) {
    children.push(
      el(
        'bindingDesc',
        [],
        [
          proseLeaf(
            'binding',
            [
              ['notBefore', state.binding.notBefore],
              ['notAfter', state.binding.notAfter],
              ['contemporary', state.binding.contemporary],
            ],
            state.binding.innerXml
          ),
        ]
      )
    );
  }
  if (state.accMatInnerXml !== undefined) {
    children.push(proseLeaf('accMat', [], state.accMatInnerXml));
  }
  return serializeFragment(el('physDesc', [], children));
}

// ── history from/to ─────────────────────────────────────────────────────

export function historyFromFragment(fragment: string): FromFragmentResult<HistoryState> {
  return runFromFragment(() => {
    const { root, source } = parseArea('history', fragment);
    const origin = single(root, 'origin');
    const origDate = origin ? single(origin, 'origDate') : undefined;
    const origPlace = origin ? single(origin, 'origPlace') : undefined;
    const acquisition = single(root, 'acquisition');
    return {
      origin: origin
        ? {
            origDate: origDate
              ? {
                  calendar: attrValue(origDate, 'calendar'),
                  notBefore: attrValue(origDate, 'notBefore'),
                  notAfter: attrValue(origDate, 'notAfter'),
                  when: attrValue(origDate, 'when'),
                  text: textOf(origDate),
                }
              : undefined,
            origPlace: origPlace
              ? {
                  country: extractKeyedText(single(origPlace, 'country')),
                  region: extractKeyedText(single(origPlace, 'region')),
                  settlement: extractKeyedText(single(origPlace, 'settlement')),
                }
              : undefined,
          }
        : undefined,
      provenances: list(root, 'provenance').map((provenance) => ({
        notAfter: attrValue(provenance, 'notAfter'),
        when: attrValue(provenance, 'when'),
        innerXml: innerXml(source, provenance),
      })),
      acquisition: acquisition
        ? { when: attrValue(acquisition, 'when'), innerXml: innerXml(source, acquisition) }
        : undefined,
    };
  });
}

export function historyToFragment(state: HistoryState): string {
  const children: BuildNode[] = [];
  if (state.origin !== undefined) {
    const originChildren: BuildNode[] = [];
    if (state.origin.origDate !== undefined) {
      const origDate = state.origin.origDate;
      originChildren.push(
        textLeaf(
          'origDate',
          [
            ['calendar', origDate.calendar],
            ['notBefore', origDate.notBefore],
            ['notAfter', origDate.notAfter],
            ['when', origDate.when],
          ],
          origDate.text
        )
      );
    }
    if (state.origin.origPlace !== undefined) {
      const origPlace = state.origin.origPlace;
      const placeChildren: BuildNode[] = [];
      if (origPlace.country !== undefined) {
        placeChildren.push(
          textLeaf('country', [['key', origPlace.country.key]], origPlace.country.text)
        );
      }
      if (origPlace.region !== undefined) {
        placeChildren.push(
          textLeaf('region', [['key', origPlace.region.key]], origPlace.region.text)
        );
      }
      if (origPlace.settlement !== undefined) {
        placeChildren.push(
          textLeaf('settlement', [['key', origPlace.settlement.key]], origPlace.settlement.text)
        );
      }
      originChildren.push(el('origPlace', [], placeChildren));
    }
    children.push(el('origin', [], originChildren));
  }
  for (const provenance of state.provenances) {
    children.push(
      proseLeaf(
        'provenance',
        [
          ['notAfter', provenance.notAfter],
          ['when', provenance.when],
        ],
        provenance.innerXml
      )
    );
  }
  if (state.acquisition !== undefined) {
    children.push(
      proseLeaf('acquisition', [['when', state.acquisition.when]], state.acquisition.innerXml)
    );
  }
  return serializeFragment(el('history', [], children));
}

// ── Area dispatch ───────────────────────────────────────────────────────

export interface MsDescAreaStates {
  msIdentifier: MsIdentifierState;
  msContents: MsContentsState;
  physDesc: PhysDescState;
  history: HistoryState;
}

const FROM_FRAGMENT: {
  [A in MsDescAreaId]: (fragment: string) => FromFragmentResult<MsDescAreaStates[A]>;
} = {
  msIdentifier: msIdentifierFromFragment,
  msContents: msContentsFromFragment,
  physDesc: physDescFromFragment,
  history: historyFromFragment,
};

const TO_FRAGMENT: { [A in MsDescAreaId]: (state: MsDescAreaStates[A]) => string } = {
  msIdentifier: msIdentifierToFragment,
  msContents: msContentsToFragment,
  physDesc: physDescToFragment,
  history: historyToFragment,
};

/** Parse an area fragment to typed form state (or a representability rejection). */
export function msdescFromFragment<A extends MsDescAreaId>(
  area: A,
  fragment: string
): FromFragmentResult<MsDescAreaStates[A]> {
  return FROM_FRAGMENT[area](fragment);
}

/** Serialize typed form state back to the area's canonical fragment. */
export function msdescToFragment<A extends MsDescAreaId>(
  area: A,
  state: MsDescAreaStates[A]
): string {
  return TO_FRAGMENT[area](state);
}
