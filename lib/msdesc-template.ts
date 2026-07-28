/**
 * msDesc per-area template skeletons (TEI descriptions roadmap 2.5 data) —
 * canonical element fragments derived from
 * `msdesc-minimal/msdesc-minimal-template.xml`, used to seed a manuscript's
 * description areas on first create.
 *
 * Derivation rules (findings §8.1: the raw template's PIs/comments cannot pass
 * through the editor model):
 *   - all comments, PIs and placeholder ALL-CAPS text are stripped to empty
 *     defaults (empty elements self-close);
 *   - prose leaves whose template content is a paragraph keep an empty `<p/>`
 *     for the Phase-3 rich editor to mount on;
 *   - the template's attribute defaults are kept as initial dropdown values
 *     (`form="codex"`, `material="perg"`, `mainLang="la"`,
 *     `calendar="#Gregorian"`, `columns="1"`, layout/hand vocab defaults);
 *   - example/placeholder attribute values (`xml:id`, placeholder dates,
 *     `quantity="0"`, `writtenLines="0"`, empty `key` prefixes) are dropped;
 *   - optional sections the template comments out (`msName`, `altIdentifier`,
 *     `accMat`, `region`, `settlement`) are omitted.
 *
 * Every skeleton is exactly the canonical serialization of its parsed form
 * state: `msdescFromFragment(area, skeleton)` succeeds and
 * `msdescToFragment(area, state)` reproduces the skeleton byte-identically
 * (asserted in `msdesc-template.test.ts`).
 */

import type { MsDescAreaId } from '@/lib/msdesc-vocab';

const MS_IDENTIFIER_TEMPLATE = `<msIdentifier>
  <country/>
  <settlement/>
  <institution/>
  <repository/>
  <idno type="shelfmark"/>
</msIdentifier>`;

const MS_CONTENTS_TEMPLATE = `<msContents>
  <summary/>
  <textLang mainLang="la">Latin</textLang>
  <msItem n="1">
    <locus/>
    <author/>
    <title/>
    <textLang mainLang="la">Latin</textLang>
    <rubric/>
    <incipit/>
    <explicit/>
    <finalRubric/>
    <note/>
  </msItem>
</msContents>`;

const PHYS_DESC_TEMPLATE = `<physDesc>
  <objectDesc form="codex">
    <supportDesc material="perg">
      <support>
        <material>Parchment</material>
      </support>
      <extent>
        <measure type="leaf"/>
        <dimensions type="leaf" unit="mm">
          <height/>
          <width/>
        </dimensions>
        <dimensions type="written" unit="mm">
          <height/>
          <width/>
        </dimensions>
      </extent>
      <foliation/>
      <collation><p/></collation>
      <condition/>
    </supportDesc>
    <layoutDesc>
      <layout columns="1" rulingMedium="leadpoint" topLine="above"><p/></layout>
    </layoutDesc>
  </objectDesc>
  <handDesc hands="1">
    <handNote script="textualisNorthern" execution="formata" scope="sole" medium="brown-ink"><p/></handNote>
  </handDesc>
  <decoDesc>
    <summary/>
    <decoNote type="flourInit"><p/></decoNote>
  </decoDesc>
  <additions><p/></additions>
  <bindingDesc>
    <binding><p/></binding>
  </bindingDesc>
</physDesc>`;

const HISTORY_TEMPLATE = `<history>
  <origin>
    <origDate calendar="#Gregorian"/>
    <origPlace>
      <country/>
    </origPlace>
  </origin>
  <provenance><p/></provenance>
  <acquisition><p/></acquisition>
</history>`;

/** Canonical skeleton fragment per description area. */
export const MSDESC_TEMPLATE_FRAGMENTS: Record<MsDescAreaId, string> = {
  msIdentifier: MS_IDENTIFIER_TEMPLATE,
  msContents: MS_CONTENTS_TEMPLATE,
  physDesc: PHYS_DESC_TEMPLATE,
  history: HISTORY_TEMPLATE,
};

/** The canonical skeleton fragment used to seed a newly created area. */
export function msdescTemplateFragment(area: MsDescAreaId): string {
  return MSDESC_TEMPLATE_FRAGMENTS[area];
}
