/**
 * SSR-safe TEI XML → data-dpt HTML translator (Phase H.6).
 *
 * Mirrors the backend `tei_to_data_dpt` converter as pure string ops (no
 * DOMParser, so it runs in both server and client renders). Translating TEI
 * back into the data-dpt span form means the existing prose CSS and the
 * text↔region linking (which key off `data-dpt` / `data-graph-id`) keep
 * working unchanged once stored content flips to TEI.
 *
 * Every TEI element maps to a `<span>`, so closing tags translate to
 * `</span>` without tracking a stack. Non-TEI markup passes through verbatim.
 */

const TEI_TO_DPT: Record<string, string> = {
  seg: 'clause',
  persname: 'person',
  placename: 'place',
  ex: 'ex',
  supplied: 'supplied',
  lb: 'lb',
};

const DPT_CAT: Record<string, string> = {
  clause: 'words',
  person: 'chars',
  place: 'chars',
  ex: 'chars',
  supplied: 'chars',
};

const TEI_ELEMENT_RE = /<(seg|persName|placeName|ex|supplied|lb)\b/i;
// Attr values in this corpus never contain `>`, so a `[^>]` body is safe.
const TAG_RE = /<(\/)?([a-zA-Z][\w:.-]*)((?:[^>])*?)(\/)?>/g;
const ATTR_RE = /([\w:-]+)\s*=\s*"([^"]*)"|([\w:-]+)\s*=\s*'([^']*)'/g;

/** True when content is TEI rather than the legacy data-dpt HTML. */
export function isTei(content: string): boolean {
  return !content.includes('data-dpt') && TEI_ELEMENT_RE.test(content);
}

function parseAttrs(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let match: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((match = ATTR_RE.exec(attrString)) !== null) {
    if (match[1] !== undefined) attrs[match[1].toLowerCase()] = match[2];
    else attrs[match[3].toLowerCase()] = match[4];
  }
  return attrs;
}

function correspToGraphIds(raw: string): string {
  return raw
    .split(/\s+/)
    .map((token) => token.replace(/^#/, ''))
    .filter((token) => token.startsWith('gid-'))
    .map((token) => token.slice('gid-'.length))
    .join(',');
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function openSpan(dpt: string, attrs: Record<string, string>): string {
  const parts = [`data-dpt="${dpt}"`];
  if (dpt === 'lb') {
    if (attrs.type === 'sep') parts.push('data-dpt-cat="sep"');
  } else {
    parts.push(`data-dpt-cat="${DPT_CAT[dpt]}"`);
    if (attrs.type) parts.push(`data-dpt-type="${escapeAttr(attrs.type)}"`);
  }
  if (attrs.source) parts.push(`data-dpt-src="${escapeAttr(attrs.source)}"`);
  if (attrs.corresp) {
    const ids = correspToGraphIds(attrs.corresp);
    if (ids) parts.push(`data-graph-id="${ids}"`);
  }
  return `<span ${parts.join(' ')}>`;
}

export function teiToDptHtml(content: string): string {
  return content.replace(TAG_RE, (full, slash, name, attrString, selfClose) => {
    const dpt = TEI_TO_DPT[String(name).toLowerCase()];
    if (!dpt) return full; // non-TEI markup passes through unchanged
    if (slash) return '</span>';
    const open = openSpan(dpt, parseAttrs(attrString));
    return selfClose ? `${open}</span>` : open;
  });
}

/** Render either storage format as data-dpt HTML for the prose viewer. */
export function toDptHtml(content: string): string {
  return isTei(content) ? teiToDptHtml(content) : content;
}
