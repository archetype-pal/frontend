import { describe, expect, it } from 'vitest';

import type {
  HistoryState,
  MsContentsState,
  MsIdentifierState,
  PhysDescState,
} from '@/lib/msdesc-form';
import {
  historyFromFragment,
  historyToFragment,
  msContentsFromFragment,
  msContentsToFragment,
  msIdentifierFromFragment,
  msIdentifierToFragment,
  msdescFromFragment,
  msdescToFragment,
  physDescFromFragment,
  physDescToFragment,
} from '@/lib/msdesc-form';

function expectOk<S>(result: { ok: true; state: S } | { ok: false; reason: string }): S {
  if (!result.ok) throw new Error(`expected representable, got: ${result.reason}`);
  return result.state;
}

function expectRejected<S>(result: { ok: true; state: S } | { ok: false; reason: string }): string {
  if (result.ok) throw new Error('expected the fragment to be unrepresentable');
  return result.reason;
}

// ── Canonical fragments (byte-equal round trips) ────────────────────────

const CANONICAL_MS_IDENTIFIER = `<msIdentifier>
  <country>United Kingdom</country>
  <settlement>Oxford</settlement>
  <institution>University of Oxford</institution>
  <repository>Bodleian Library</repository>
  <idno type="shelfmark">MS. Bodl. 264</idno>
  <msName>The Book of Alexander</msName>
  <altIdentifier type="internal">
    <idno type="SCN">2070</idno>
  </altIdentifier>
</msIdentifier>`;

const CANONICAL_MS_CONTENTS = `<msContents>
  <summary>A collection of theological texts.</summary>
  <textLang mainLang="la">Latin</textLang>
  <msItem n="1" xml:id="MS-item1">
    <locus from="1r" to="24v">Fols. 1r–24v</locus>
    <author key="person_100184667">Augustine of Hippo</author>
    <title key="work_790">De civitate Dei</title>
    <textLang mainLang="la">Latin</textLang>
    <rubric>Incipit liber primus</rubric>
    <incipit>Gloriosissimam ciuitatem dei</incipit>
    <explicit>in aeternum regnaturum</explicit>
    <finalRubric>Explicit liber primus</finalRubric>
    <note>Preceded by a prefatory letter.</note>
  </msItem>
</msContents>`;

/**
 * The PO's physDesc example (TEI-DESCRIPTIONS-FINDINGS §0/§3: "Form: codex /
 * Support: parchment / Dimensions (leaf): 103 × 75 mm / Layout: 15 lines /
 * Decoration: …"), encoded per the msdesc-minimal ODD's own examples —
 * including inline markup inside the prose leaves (hi, origDate).
 */
const PO_PHYS_DESC = `<physDesc>
  <objectDesc form="codex">
    <supportDesc material="perg">
      <support>
        <material>Parchment</material>
      </support>
      <extent>
        <measure type="leaf" quantity="24">24 leaves</measure>
        <dimensions type="leaf" unit="mm">
          <height>103</height>
          <width>75</width>
        </dimensions>
      </extent>
      <foliation>Modern pencil foliation, 1–24, upper right recto.</foliation>
      <collation><p>1–3<hi rend="superscript">8</hi></p></collation>
      <condition>Good; some water staining to lower margin.</condition>
    </supportDesc>
    <layoutDesc>
      <layout columns="1" writtenLines="15" rulingMedium="leadpoint" topLine="below"><p>Single column of 15 lines, ruled in leadpoint.</p></layout>
    </layoutDesc>
  </objectDesc>
  <handDesc hands="1">
    <handNote xml:id="hand-1" script="textualisNorthern" execution="formata" scope="sole" medium="brown-ink"><p>Gothic textualis formata, <origDate notBefore="1290" notAfter="1310">c. 1300</origDate>.</p></handNote>
  </handDesc>
  <decoDesc>
    <summary>Decoration in red and blue throughout.</summary>
    <decoNote type="flourInit"><p>Two-line alternating red and blue penwork initials.</p></decoNote>
  </decoDesc>
</physDesc>`;

const CANONICAL_HISTORY = `<history>
  <origin>
    <origDate calendar="#Gregorian" notBefore="1290" notAfter="1310">c. 1300</origDate>
    <origPlace>
      <country key="place_7002445">England</country>
    </origPlace>
  </origin>
  <provenance notAfter="1500"><p>Owned by <persName key="person_12345" role="fmo">John de Bruges</persName>.</p></provenance>
  <provenance when="1602"><p>Former shelfmark <q type="pressmark">Art. 264</q>.</p></provenance>
  <acquisition when="1602"><p>Received by the Bodleian Library, <date when="1602">1602</date>.</p></acquisition>
</history>`;

describe('canonical fragment → state → fragment (byte-equal)', () => {
  it('msIdentifier', () => {
    const state = expectOk(msIdentifierFromFragment(CANONICAL_MS_IDENTIFIER));
    expect(msIdentifierToFragment(state)).toBe(CANONICAL_MS_IDENTIFIER);
  });

  it('msContents', () => {
    const state = expectOk(msContentsFromFragment(CANONICAL_MS_CONTENTS));
    expect(msContentsToFragment(state)).toBe(CANONICAL_MS_CONTENTS);
  });

  it('physDesc (the PO example)', () => {
    const state = expectOk(physDescFromFragment(PO_PHYS_DESC));
    expect(physDescToFragment(state)).toBe(PO_PHYS_DESC);
  });

  it('history', () => {
    const state = expectOk(historyFromFragment(CANONICAL_HISTORY));
    expect(historyToFragment(state)).toBe(CANONICAL_HISTORY);
  });
});

describe('the PO physDesc example', () => {
  it('parses into the structured display values', () => {
    const state = expectOk(physDescFromFragment(PO_PHYS_DESC));
    expect(state.objectDesc.form).toBe('codex');
    expect(state.objectDesc.supportDesc.material).toBe('perg');
    expect(state.objectDesc.supportDesc.support?.materialText).toBe('Parchment');
    expect(state.objectDesc.supportDesc.extent?.dimensions).toEqual([
      { type: 'leaf', unit: 'mm', height: '103', width: '75' },
    ]);
    expect(state.objectDesc.layout?.writtenLines).toBe('15');
    expect(state.handDesc?.handNotes[0].script).toBe('textualisNorthern');
    expect(state.decoDesc?.decoNotes[0].type).toBe('flourInit');
  });

  it('round-trips value-stable and keeps prose-leaf markup byte-verbatim', () => {
    const state = expectOk(physDescFromFragment(PO_PHYS_DESC));
    const reserialized = physDescToFragment(state);
    expect(expectOk(physDescFromFragment(reserialized))).toEqual(state);
    // Inline markup inside the prose leaves survives untouched.
    expect(state.objectDesc.supportDesc.collationInnerXml).toBe(
      '<p>1–3<hi rend="superscript">8</hi></p>'
    );
    expect(state.handDesc?.handNotes[0].innerXml).toBe(
      '<p>Gothic textualis formata, <origDate notBefore="1290" notAfter="1310">c. 1300</origDate>.</p>'
    );
  });
});

describe('state → fragment → state (deep-equal)', () => {
  it('msIdentifier, including present-but-empty vs absent optionals', () => {
    const state: MsIdentifierState = {
      country: 'Scotland',
      settlement: 'Edinburgh',
      institution: '',
      repository: 'National Records of Scotland',
      shelfmark: 'GD 55/1',
      msName: '',
      altIdentifiers: [
        { type: 'former', idno: 'A.1' },
        { type: 'internal', idnoType: 'SCN', idno: '2070' },
      ],
    };
    expect(expectOk(msIdentifierFromFragment(msIdentifierToFragment(state)))).toEqual(state);
  });

  it('msContents with sparse msItems', () => {
    const state: MsContentsState = {
      textLang: { mainLang: 'la', text: 'Latin' },
      msItems: [
        { n: '1', author: { text: 'Anonymous' }, noteInnerXml: '<p>Fragmentary.</p>' },
        { title: { key: 'work_9', text: 'Vita sancti' }, incipit: 'In illo tempore' },
      ],
    };
    expect(expectOk(msContentsFromFragment(msContentsToFragment(state)))).toEqual(state);
  });

  it('physDesc with XML-significant characters in text and attributes', () => {
    const state: PhysDescState = {
      objectDesc: {
        form: 'roll',
        supportDesc: {
          material: 'mixed',
          support: { materialText: 'Parchment & paper' },
          extent: {
            measures: [{ type: 'leaf', quantity: '3', text: '3 membranes < full length' }],
            dimensions: [],
          },
          condition: 'Stains & tears',
        },
      },
      handDesc: {
        hands: '2',
        handNotes: [{ scope: 'sole', medium: 'iron-gall "black" ink', innerXml: '' }],
      },
      additionsInnerXml: '<p>Marginalia &amp; glosses.</p>',
      binding: { contemporary: 'true', innerXml: '<p>Original sewing.</p>' },
    };
    const fragment = physDescToFragment(state);
    expect(fragment).toContain('quantity="3"');
    expect(fragment).toContain('3 membranes &lt; full length');
    expect(fragment).toContain('medium="iron-gall &quot;black&quot; ink"');
    expect(fragment).toContain('Stains &amp; tears');
    expect(expectOk(physDescFromFragment(fragment))).toEqual(state);
  });

  it('history with every optional populated', () => {
    const state: HistoryState = {
      origin: {
        origDate: { calendar: '#Gregorian', when: '1200', text: 'AD 1200' },
        origPlace: {
          country: { key: 'place_1', text: 'Scotland' },
          region: { text: 'Lothian' },
          settlement: { key: 'place_2', text: 'Edinburgh' },
        },
      },
      provenances: [
        { notAfter: '1500', innerXml: '<p>First owner.</p>' },
        { when: '1602', innerXml: '<p>Second owner.</p>' },
      ],
      acquisition: { when: '1700', innerXml: '<p>Purchased.</p>' },
    };
    expect(expectOk(historyFromFragment(historyToFragment(state)))).toEqual(state);
  });

  it('minimal empty states normalize stably', () => {
    const physDesc: PhysDescState = { objectDesc: { supportDesc: {} } };
    const fragment = physDescToFragment(physDesc);
    expect(fragment).toBe(
      '<physDesc>\n  <objectDesc>\n    <supportDesc/>\n  </objectDesc>\n</physDesc>'
    );
    expect(expectOk(physDescFromFragment(fragment))).toEqual(physDesc);

    const history: HistoryState = { provenances: [] };
    expect(expectOk(historyFromFragment(historyToFragment(history)))).toEqual(history);
  });
});

describe('representability gate', () => {
  it('rejects unknown elements (e.g. <sealDesc>)', () => {
    const reason = expectRejected(
      physDescFromFragment('<physDesc><sealDesc><p>Seal on tag.</p></sealDesc></physDesc>')
    );
    expect(reason).toContain('<sealDesc>');
  });

  it('rejects unknown attributes', () => {
    const reason = expectRejected(
      physDescFromFragment(
        '<physDesc><objectDesc form="codex" rend="fancy"><supportDesc/></objectDesc></physDesc>'
      )
    );
    expect(reason).toContain('rend');
  });

  it('rejects nested surprises inside modelled containers', () => {
    const reason = expectRejected(
      physDescFromFragment(
        '<physDesc><objectDesc><supportDesc><support><watermark>Bull</watermark></support></supportDesc></objectDesc></physDesc>'
      )
    );
    expect(reason).toContain('<watermark>');
  });

  it.each([
    [
      'objectDesc/@form',
      '<physDesc><objectDesc form="scroll"><supportDesc/></objectDesc></physDesc>',
    ],
    [
      'supportDesc/@material',
      '<physDesc><objectDesc><supportDesc material="vellum"/></objectDesc></physDesc>',
    ],
    [
      'layout/@topLine',
      '<physDesc><objectDesc><supportDesc/><layoutDesc><layout topLine="middle"/></layoutDesc></objectDesc></physDesc>',
    ],
    ['handNote/@script', '<physDesc><handDesc><handNote script="bastarda"/></handDesc></physDesc>'],
    [
      'handNote/@execution',
      '<physDesc><handDesc><handNote execution="fast"/></handDesc></physDesc>',
    ],
    ['decoNote/@type', '<physDesc><decoDesc><decoNote type="sparkles"/></decoDesc></physDesc>'],
  ])('rejects out-of-vocabulary %s values', (_label, fragment) => {
    expect(expectRejected(physDescFromFragment(fragment))).toContain('unsupported');
  });

  it('rejects comments rather than dropping them', () => {
    expect(
      expectRejected(historyFromFragment('<history><!-- lost forever? no: rejected --></history>'))
    ).toContain('not supported');
  });

  it('rejects stray text inside element-only containers', () => {
    const reason = expectRejected(
      historyFromFragment(
        '<history><origin><origPlace><country>England</country>, <settlement>London</settlement></origPlace></origin></history>'
      )
    );
    expect(reason).toContain('text');
  });

  it('rejects duplicated singleton elements instead of keeping one', () => {
    const reason = expectRejected(
      physDescFromFragment(
        '<physDesc><objectDesc><supportDesc/><layoutDesc><layout/><layout/></layoutDesc></objectDesc></physDesc>'
      )
    );
    expect(reason).toContain('more than one');
  });

  it('rejects a non-shelfmark top-level idno in msIdentifier', () => {
    expect(
      expectRejected(
        msIdentifierFromFragment('<msIdentifier><idno type="SCN">2070</idno></msIdentifier>')
      )
    ).toContain('idno');
  });

  it('rejects a fragment rooted at the wrong area element', () => {
    expect(expectRejected(physDescFromFragment(CANONICAL_HISTORY))).toContain(
      'expected a <physDesc>'
    );
  });

  it('rejects malformed XML', () => {
    expect(
      expectRejected(msContentsFromFragment('<msContents><summary></msContents>'))
    ).toBeTruthy();
  });
});

describe('prose-leaf re-embedding (2.2b compose contract)', () => {
  it('replacing one leaf innerXml leaves every other byte of the area unchanged', () => {
    const state = expectOk(physDescFromFragment(PO_PHYS_DESC));
    const edited = '<p>Rewritten decoration description.</p>';
    state.decoDesc!.decoNotes[0].innerXml = edited;
    expect(physDescToFragment(state)).toBe(
      PO_PHYS_DESC.replace('<p>Two-line alternating red and blue penwork initials.</p>', edited)
    );
  });

  it('an emptied prose leaf self-closes and stays representable', () => {
    const state = expectOk(historyFromFragment(CANONICAL_HISTORY));
    state.provenances[1].innerXml = '';
    const fragment = historyToFragment(state);
    expect(fragment).toContain('<provenance when="1602"/>');
    expect(expectOk(historyFromFragment(fragment)).provenances[1]).toEqual({
      when: '1602',
      innerXml: '',
    });
  });
});

describe('area dispatch', () => {
  it('routes msdescFromFragment/msdescToFragment by area', () => {
    const state = expectOk(msdescFromFragment('msIdentifier', CANONICAL_MS_IDENTIFIER));
    expect(msdescToFragment('msIdentifier', state)).toBe(CANONICAL_MS_IDENTIFIER);
    expect(msdescFromFragment('history', CANONICAL_MS_IDENTIFIER).ok).toBe(false);
  });
});
