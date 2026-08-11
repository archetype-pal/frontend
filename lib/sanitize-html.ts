import DOMPurify, { type ElementHook, type UponSanitizeAttributeHook } from 'isomorphic-dompurify';

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

const LEGACY_PUBLICATION_TAGS = [...DEFAULT_TAGS, 'iframe'] as const;

const LEGACY_PUBLICATION_ATTR = [
  ...DEFAULT_ATTR,
  'style',
  'allow',
  'allowfullscreen',
  'frameborder',
  'loading',
  'referrerpolicy',
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
const YOUTUBE_EMBED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);
const SAFE_YOUTUBE_QUERY_PARAMS = new Set(['end', 'modestbranding', 'playsinline', 'rel', 'start']);
const SAFE_IFRAME_ATTRS = new Set([
  'allow',
  'allowfullscreen',
  'height',
  'loading',
  'referrerpolicy',
  'src',
  'title',
  'width',
]);

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

function normalizeYoutubeEmbedSrc(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed);
    const host = url.hostname.toLowerCase();
    if (!YOUTUBE_EMBED_HOSTS.has(host)) return null;

    const [embed, videoId] = url.pathname.split('/').filter(Boolean);
    if (embed !== 'embed' || !videoId || !/^[A-Za-z0-9_-]{6,64}$/.test(videoId)) {
      return null;
    }

    const safeSearch = new URLSearchParams();
    for (const [key, paramValue] of url.searchParams) {
      if (SAFE_YOUTUBE_QUERY_PARAMS.has(key) && /^[\w.-]{1,64}$/.test(paramValue)) {
        safeSearch.set(key, paramValue);
      }
    }

    const canonicalHost = host.includes('youtube-nocookie')
      ? 'www.youtube-nocookie.com'
      : 'www.youtube.com';
    const query = safeSearch.toString();
    return `https://${canonicalHost}/embed/${videoId}${query ? `?${query}` : ''}`;
  } catch {
    return null;
  }
}

function safeIframeDimension(value: string | null, fallback: string): string {
  if (!value || !/^\d{1,4}$/.test(value)) return fallback;

  const numericValue = Number.parseInt(value, 10);
  if (numericValue < 1 || numericValue > 2000) return fallback;
  return String(numericValue);
}

function sanitizeLegacyPublicationIframe(node: Element): void {
  if (node.tagName.toLowerCase() !== 'iframe') return;

  const src = normalizeYoutubeEmbedSrc(node.getAttribute('src') ?? '');
  if (!src) {
    node.remove();
    return;
  }

  for (const attr of Array.from(node.attributes)) {
    if (!SAFE_IFRAME_ATTRS.has(attr.name.toLowerCase())) {
      node.removeAttribute(attr.name);
    }
  }

  node.setAttribute('src', src);
  node.setAttribute('width', safeIframeDimension(node.getAttribute('width'), '560'));
  node.setAttribute('height', safeIframeDimension(node.getAttribute('height'), '315'));
  node.setAttribute('title', node.getAttribute('title')?.trim() || 'YouTube video player');
  node.setAttribute(
    'allow',
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
  );
  node.setAttribute('allowfullscreen', '');
  node.setAttribute('loading', 'lazy');
  node.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
}

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows common formatting tags from the rich text editor but strips scripts.
 */
export function sanitizeHtml(dirty: string, options: SanitizeOptions = {}): string {
  const allowedTags = options.allowLegacyPublicationStyles
    ? [...LEGACY_PUBLICATION_TAGS]
    : [...DEFAULT_TAGS];
  const allowedAttrs = options.allowLegacyPublicationStyles
    ? [...LEGACY_PUBLICATION_ATTR]
    : [...DEFAULT_ATTR];
  const config = {
    ALLOWED_TAGS: allowedTags,
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

  const iframeHook: ElementHook = (node) => {
    sanitizeLegacyPublicationIframe(node);
  };

  DOMPurify.addHook('uponSanitizeAttribute', styleHook);
  DOMPurify.addHook('afterSanitizeAttributes', iframeHook);
  try {
    return DOMPurify.sanitize(dirty, config);
  } finally {
    DOMPurify.removeHook('uponSanitizeAttribute', styleHook);
    DOMPurify.removeHook('afterSanitizeAttributes', iframeHook);
  }
}
