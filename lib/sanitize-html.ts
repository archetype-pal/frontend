import DOMPurify, { type UponSanitizeAttributeHook } from 'isomorphic-dompurify';

const DEFAULT_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'hr',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'blockquote',
  'pre',
  'code',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'del',
  'mark',
  'sub',
  'sup',
  'a',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'div',
  'span',
] as const;

const DEFAULT_ATTR = [
  'href',
  'target',
  'rel',
  'title',
  'src',
  'alt',
  'width',
  'height',
  'class',
  'id',
  'colspan',
  'rowspan',
] as const;

export interface SanitizeOptions {
  /** Permit `data-*` attributes (e.g. paleography clause/person markup). */
  allowDataAttr?: boolean;
  /** Preserve narrowly validated legacy publication layout styles. */
  allowLegacyPublicationStyles?: boolean;
}

const SAFE_LENGTH_STYLE_PROPERTIES = new Set(['margin-left', 'margin-right', 'padding-left']);
const SAFE_TEXT_ALIGN_VALUES = new Set(['left', 'right', 'center', 'justify']);
const SAFE_BORDER_VALUES = new Set(['1px solid black', '1px solid #000', '1px solid #000000']);
const SAFE_LENGTH_RE = /^(?:0|(?:\d{1,3})(?:\.\d{1,2})?px)$/i;

function normalizeCssValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isSafeLengthValue(value: string): boolean {
  if (!SAFE_LENGTH_RE.test(value)) return false;
  if (value === '0') return true;
  return Number.parseFloat(value) <= 200;
}

function sanitizeLegacyPublicationStyle(style: string): string {
  const declarations: string[] = [];

  for (const declaration of style.split(';')) {
    const [rawProperty, ...rawValueParts] = declaration.split(':');
    if (!rawProperty || rawValueParts.length === 0) continue;

    const property = rawProperty.trim().toLowerCase();
    const value = normalizeCssValue(rawValueParts.join(':'));

    if (SAFE_LENGTH_STYLE_PROPERTIES.has(property) && isSafeLengthValue(value)) {
      declarations.push(`${property}: ${value};`);
    } else if (property === 'text-align' && SAFE_TEXT_ALIGN_VALUES.has(value)) {
      declarations.push(`${property}: ${value};`);
    } else if (property === 'border' && SAFE_BORDER_VALUES.has(value)) {
      declarations.push(`${property}: ${value};`);
    }
  }

  return declarations.join(' ');
}

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows common formatting tags from the rich text editor but strips scripts.
 */
export function sanitizeHtml(dirty: string, options: SanitizeOptions = {}): string {
  const allowedAttrs = options.allowLegacyPublicationStyles
    ? [...DEFAULT_ATTR, 'style']
    : [...DEFAULT_ATTR];
  const config = {
    ALLOWED_TAGS: [...DEFAULT_TAGS],
    ALLOWED_ATTR: allowedAttrs,
    ALLOW_DATA_ATTR: options.allowDataAttr ?? false,
  };

  if (!options.allowLegacyPublicationStyles) {
    return DOMPurify.sanitize(dirty, config);
  }

  const styleHook: UponSanitizeAttributeHook = (_node, data) => {
    if (data.attrName.toLowerCase() !== 'style') return;

    const safeStyle = sanitizeLegacyPublicationStyle(data.attrValue);
    if (safeStyle) {
      data.attrValue = safeStyle;
    } else {
      data.keepAttr = false;
    }
  };

  DOMPurify.addHook('uponSanitizeAttribute', styleHook);
  try {
    return DOMPurify.sanitize(dirty, config);
  } finally {
    DOMPurify.removeHook('uponSanitizeAttribute', styleHook);
  }
}
