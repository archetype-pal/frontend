/**
 * Dual-format catalogue descriptions (docs/tei.md §4.5).
 *
 * `HistoricalItemDescription.content` holds EITHER legacy catalogue HTML — 703
 * rows of it, from outside sources — OR TEI prose whose people, places and
 * manuscripts are links into the corpus. One column, discriminated in band.
 *
 * The discriminator is **a storage-owned wrapper element carrying the TEI
 * namespace**, never a sniff for TEI element names. `isTei()` in
 * `tei-to-dpt-html.ts` can sniff because image-text content is a closed corpus
 * of two known formats; catalogue HTML is arbitrary, and a description that
 * merely *quotes* `<persName>` in an example must not be reinterpreted as
 * markup. A namespace on the root cannot be arrived at by accident.
 *
 * The wrapper never reaches the editor. `teiToDoc`/`docToTei` silently drop any
 * element enclosing the prose (docs/tei.md §4.5), so a wrapper that round-tripped
 * through Rich mode would be eaten on the first keystroke — taking the row's
 * identity as TEI with it. Storage adds it on save and strips it on load, the
 * same contract the msDesc composer honours for area fragments.
 */

export const TEI_NS = 'http://www.tei-c.org/ns/1.0';

/** `type` on the wrapper — a TEI `<div>` is a text division; this says which. */
const WRAPPER_TYPE = 'description';

/** The wrapper's opening tag, anchored at the start of the value. */
const OPEN_TAG_RE = /^<div(\s[^>]*?)?(\/)?>/i;
const ATTR_RE = /([\w:.-]+)\s*=\s*"([^"]*)"|([\w:.-]+)\s*=\s*'([^']*)'/g;

interface OpenTag {
  attrs: Record<string, string>;
  /** Length of the opening tag, so the caller can slice past it. */
  end: number;
  selfClosing: boolean;
}

/** Parse the value's leading `<div …>` if it has one. */
function readOpenTag(content: string): OpenTag | null {
  const match = OPEN_TAG_RE.exec(content);
  if (!match) return null;

  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let attr: RegExpExecArray | null;
  while ((attr = ATTR_RE.exec(match[1] ?? '')) !== null) {
    if (attr[1] !== undefined) attrs[attr[1].toLowerCase()] = attr[2];
    else attrs[attr[3].toLowerCase()] = attr[4];
  }

  return { attrs, end: match[0].length, selfClosing: match[2] === '/' };
}

/**
 * Whether this description is TEI rather than legacy HTML.
 *
 * Requires the TEI namespace on a `<div>` that is the value's *root* — it must
 * both open the value and close it. A wrapper appearing part-way through, or a
 * plain HTML `<div>` (which legacy content routinely starts with), is not TEI.
 */
export function isTeiDescription(content: string): boolean {
  const trimmed = content.trim();
  const open = readOpenTag(trimmed);
  if (!open || open.attrs['xmlns'] !== TEI_NS) return false;

  // Root-ness: a self-closing wrapper is the whole value; otherwise the value
  // has to end on a close tag. `<div xmlns=…>a</div><p>b</p>` is not a TEI
  // description — its root is a sequence, and the prose would be truncated.
  return open.selfClosing ? trimmed.length === open.end : trimmed.endsWith('</div>');
}

/**
 * The `<p>`-sequence inside a TEI description, ready for the editor.
 *
 * Returns `null` for legacy HTML, so callers branch on the return value rather
 * than calling {@link isTeiDescription} and then trusting a string.
 */
export function teiDescriptionProse(content: string): string | null {
  if (!isTeiDescription(content)) return null;

  const trimmed = content.trim();
  const open = readOpenTag(trimmed);
  if (!open) return null;
  if (open.selfClosing) return '';

  return trimmed.slice(open.end, trimmed.length - '</div>'.length).trim();
}

/**
 * Wrap a `<p>`-sequence for storage. Empty prose still gets a wrapper: the row
 * stays TEI across a save that happens to have emptied it, instead of silently
 * reverting to legacy HTML.
 */
export function wrapTeiDescription(prose: string): string {
  const inner = prose.trim();
  const open = `<div xmlns="${TEI_NS}" type="${WRAPPER_TYPE}">`;
  return inner === '' ? `${open}</div>` : `${open}${inner}</div>`;
}

/**
 * Seed a TEI description from a legacy row's **plain text**.
 *
 * Takes text, not HTML, and the distinction is load-bearing. `stripHtml` removes
 * tags but leaves entities *encoded*: feeding its output here would escape the
 * `&` of a surviving `&nbsp;` and store `&amp;nbsp;`, so the reader sees the
 * literal characters "&nbsp;". The caller strips **and decodes** — which is DOM
 * work, and this module stays pure so the public render can run on the server.
 *
 * Deliberately does NOT infer entities from the text. Machine-tagging a person
 * from a name string fabricates a scholarly claim nobody made — the same reason
 * the legacy rows were never auto-migrated to msDesc (docs/tei.md §3.5). The
 * cataloguer tags what they can vouch for.
 */
export function teiDescriptionFromText(text: string): string {
  const trimmed = text.trim();
  return wrapTeiDescription(trimmed === '' ? '' : `<p>${escapeText(trimmed)}</p>`);
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
