import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitize-html';

describe('sanitizeHtml', () => {
  it('allows safe HTML tags', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeHtml(input)).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('strips script tags', () => {
    const input = '<p>OK</p><script>alert("xss")</script>';
    expect(sanitizeHtml(input)).toBe('<p>OK</p>');
  });

  it('strips event handlers', () => {
    const input = '<p onclick="alert(1)">Click</p>';
    expect(sanitizeHtml(input)).toBe('<p>Click</p>');
  });

  it('allows links with href', () => {
    const input = '<a href="https://example.com" title="Example">Link</a>';
    expect(sanitizeHtml(input)).toContain('href="https://example.com"');
    expect(sanitizeHtml(input)).toContain('Link</a>');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});
