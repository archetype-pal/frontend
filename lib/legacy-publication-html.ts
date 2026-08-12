const RICH_EDITOR_UNSUPPORTED_TAG_RE =
  /<\/?(?:iframe|table|thead|tbody|tr|th|td|form|input|label|select|option|textarea|button|h[4-6])\b/i;
const LEGACY_ATTR_RE = /\s(?:class|style)=/i;

export function hasLegacyRichPublicationHtml(html: string): boolean {
  return RICH_EDITOR_UNSUPPORTED_TAG_RE.test(html) || LEGACY_ATTR_RE.test(html);
}
