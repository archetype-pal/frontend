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

  it('strips inline styles by default', () => {
    const input = '<p style="margin-left: 10px;">Indented</p>';
    expect(sanitizeHtml(input)).toBe('<p>Indented</p>');
  });

  it('allows narrow legacy publication styles when requested', () => {
    const input =
      '<p style="margin-left: 10px; margin-right: 10px; text-align: left;">Indented</p>' +
      '<table><tbody><tr><td style="border: 1px solid black;">Cell</td></tr></tbody></table>' +
      '<p style="padding-left: 30px;">Nested</p>';

    expect(sanitizeHtml(input, { allowLegacyPublicationStyles: true })).toBe(
      '<p style="margin-left: 10px; margin-right: 10px; text-align: left;">Indented</p>' +
        '<table><tbody><tr><td style="border: 1px solid black;">Cell</td></tr></tbody></table>' +
        '<p style="padding-left: 30px;">Nested</p>'
    );
  });

  it('strips unsafe legacy publication style declarations', () => {
    const input =
      '<p style="margin-left: 10px; position: absolute; color: red; ' +
      'background-image: url(javascript:alert(1));">Safe margin only</p>';

    expect(sanitizeHtml(input, { allowLegacyPublicationStyles: true })).toBe(
      '<p style="margin-left: 10px;">Safe margin only</p>'
    );
  });

  it('removes empty style attributes after unsafe legacy publication styles are stripped', () => {
    const input = '<p style="position: absolute;" onclick="alert(1)">Unsafe</p>';
    expect(sanitizeHtml(input, { allowLegacyPublicationStyles: true })).toBe('<p>Unsafe</p>');
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
