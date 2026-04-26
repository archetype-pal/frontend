import DOMPurify from 'isomorphic-dompurify';

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
}

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows common formatting tags from the rich text editor but strips scripts.
 */
export function sanitizeHtml(dirty: string, options: SanitizeOptions = {}): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [...DEFAULT_TAGS],
    ALLOWED_ATTR: [...DEFAULT_ATTR],
    ALLOW_DATA_ATTR: options.allowDataAttr ?? false,
  });
}
