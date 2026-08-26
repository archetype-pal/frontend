import { describe, expect, it } from 'vitest';
import { sanitizeHtml, stripHtml } from './sanitize-html';

describe('sanitizeHtml', () => {
  it('allows safe HTML tags', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeHtml(input)).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('preserves semantic definition lists used by legacy publication content', () => {
    const input =
      '<dl class="sys_events-details">' +
      '<dt><a href="/event"><img src="/media/uploads/News/2016/example.jpg" alt="Example"></a></dt>' +
      '<dt>Register here: <a href="https://example.com/">https://example.com/</a></dt>' +
      '<dd>Event details</dd>' +
      '</dl>';

    expect(sanitizeHtml(input)).toBe(input);
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

  it('preserves normalized YouTube embeds in legacy publication content', () => {
    const input =
      '<p><iframe height="315" src="https://www.youtube.com/embed/zRxcyaOfuBY?start=30&autoplay=1" width="560" onload="alert(1)"></iframe></p>';
    const sanitized = sanitizeHtml(input, { allowLegacyPublicationStyles: true });

    expect(sanitized).toContain('<iframe');
    expect(sanitized).toContain('src="https://www.youtube.com/embed/zRxcyaOfuBY?start=30"');
    expect(sanitized).toContain('width="560"');
    expect(sanitized).toContain('height="315"');
    expect(sanitized).toContain('title="YouTube video player"');
    expect(sanitized).toContain('allowfullscreen=""');
    expect(sanitized).not.toContain('autoplay=1');
    expect(sanitized).not.toContain('onload');
  });

  it('strips non-YouTube iframes from legacy publication content', () => {
    const input =
      '<p>Before</p><iframe src="https://legacy-embed.example.invalid/widget"></iframe><p>After</p>';

    const sanitized = sanitizeHtml(input, { allowLegacyPublicationStyles: true });

    expect(sanitized).toContain('<p>Before</p>');
    expect(sanitized).toContain('<p>After</p>');
    expect(sanitized).not.toContain('<iframe');
    expect(sanitized).not.toContain('legacy-embed.example.invalid');
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

describe('stripHtml', () => {
  it('strips HTML formatting tags and returns plain text', () => {
    expect(stripHtml('<i>St. Dunstan</i> &amp; <b>King Edgar</b>')).toBe(
      'St. Dunstan &amp; King Edgar'
    );
  });

  it('strips complex nested markup', () => {
    expect(
      stripHtml('<p>Charter from <a href="/manuscripts/1"><span>Glastonbury</span></a></p>')
    ).toBe('Charter from Glastonbury');
  });

  it('returns plain text unchanged (trimmed)', () => {
    expect(stripHtml('  Plain charter label  ')).toBe('Plain charter label');
  });

  it('returns empty string for empty or whitespace-only input', () => {
    expect(stripHtml('')).toBe('');
    expect(stripHtml('   ')).toBe('');
  });
});
