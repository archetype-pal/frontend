/**
 * Escaping and entity decoding shared by the TEI serialisers and the HTML
 * builders. Attribute escaping mirrors Python's html.escape(quote=True),
 * which produced the stored TEI, so values round-trip byte for byte.
 */

/** For text nodes: the three characters XML forbids in character data. */
export function escapeXmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * For attribute values and any HTML we build by hand. Every emitter must
 * agree on this, including `>` and `'`: a prose leaf built by
 * `lib/msdesc-fragments.ts` is compared byte-for-byte against `docToTei`
 * output by the leaf editor's rich-representability gate, so a value carrying
 * an apostrophe (a place name like "St Andrew's", an external URL with `'`)
 * would otherwise fail the gate and demote the leaf to the plain-textarea
 * fallback forever.
 */
export function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export const escapeHtml = escapeXmlAttr;

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** The five XML entities plus numeric references; anything else stays as written. */
export function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (full, body: string) => {
    if (body.startsWith('#')) {
      const hex = body[1] === 'x';
      const code = Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : full;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? full;
  });
}
