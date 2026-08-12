const RICH_EDITOR_DISPLAY_ONLY_TAGS = [
  'iframe',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'form',
  'input',
  'label',
  'select',
  'option',
  'textarea',
  'button',
  'div',
  'span',
  'dl',
  'dt',
  'dd',
  'h4',
  'h5',
  'h6',
  'u',
  'mark',
  'sub',
  'sup',
] as const;

const RICH_EDITOR_UNSUPPORTED_TAG_RE = new RegExp(
  `</?(?:${RICH_EDITOR_DISPLAY_ONLY_TAGS.join('|')})(?:\\s|>|/)`,
  'i'
);
const LEGACY_PRESENTATION_ATTR_RE = /\s(?:class|style)=/i;

export function hasLegacyRichPublicationHtml(html: string): boolean {
  return RICH_EDITOR_UNSUPPORTED_TAG_RE.test(html) || LEGACY_PRESENTATION_ATTR_RE.test(html);
}
