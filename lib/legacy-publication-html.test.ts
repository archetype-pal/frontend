import { describe, expect, it } from 'vitest';

import { hasLegacyRichPublicationHtml } from './legacy-publication-html';

describe('legacy publication HTML detection', () => {
  it.each([
    '<p><iframe src="https://www.youtube.com/embed/zRxcyaOfuBY"></iframe></p>',
    '<table><tbody><tr><td>Cell</td></tr></tbody></table>',
    '<h4 class="Body">Legacy heading</h4>',
    '<p class="highlight-box">Feature article</p>',
    '<p style="text-align: center;">Centered</p>',
    '<form><label><input type="checkbox"> Option</label></form>',
  ])('flags legacy-rich markup that the rich editor cannot preserve: %s', (html) => {
    expect(hasLegacyRichPublicationHtml(html)).toBe(true);
  });

  it.each([
    '',
    '<p>Plain paragraph</p>',
    '<h2>Supported heading</h2><p><strong>Bold</strong> and <em>italic</em>.</p>',
    '<ul><li>One</li><li>Two</li></ul>',
    '<blockquote>Quote</blockquote>',
    '<p><a href="/publications/blogs/post">Link</a></p>',
  ])('does not flag markup supported by the current rich editor: %s', (html) => {
    expect(hasLegacyRichPublicationHtml(html)).toBe(false);
  });
});
