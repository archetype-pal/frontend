import { describe, expect, it } from 'vitest';

import { hasLegacyRichPublicationHtml } from './legacy-publication-html';

describe('legacy publication HTML detection', () => {
  it.each([
    '<p><iframe src="https://www.youtube.com/embed/zRxcyaOfuBY"></iframe></p>',
    '<table><tbody><tr><td>Cell</td></tr></tbody></table>',
    '<h4>Legacy heading</h4>',
    '<div>Imported layout wrapper</div>',
    '<span>Imported inline wrapper</span>',
    '<dl><dt>Term</dt><dd>Definition</dd></dl>',
    '<p><u>Underline</u> <mark>mark</mark> <sub>sub</sub> <sup>sup</sup></p>',
    '<p class="highlight-box">Feature article</p>',
    '<p style="text-align: center;">Centered</p>',
    '<a href="/publications/example" class="text-primary underline">Old editor link</a>',
    '<img src="/media/uploads/example.jpg" class="rounded-md max-w-full" alt="Example">',
    '<form><label><input type="checkbox"> Option</label></form>',
  ])('flags display-only legacy markup that the rich editor cannot preserve: %s', (html) => {
    expect(hasLegacyRichPublicationHtml(html)).toBe(true);
  });

  it.each([
    '',
    '<p>Plain paragraph</p>',
    '<h1>Supported heading</h1><h2>Supported heading</h2><h3>Supported heading</h3>',
    '<p><strong>Bold</strong> <b>bold</b> <em>italic</em> <i>italic</i>.</p>',
    '<p><s>Strike</s> <del>delete</del> <code>code</code>.</p>',
    '<ul><li>One</li><li>Two</li></ul>',
    '<ol><li>One</li><li>Two</li></ol>',
    '<blockquote>Quote</blockquote>',
    '<pre><code>Code block</code></pre>',
    '<hr>',
    '<p><a href="/publications/blogs/post">Link</a></p>',
    '<p><img src="/media/uploads/example.jpg" alt="Example"></p>',
  ])('does not flag semantic markup supported by the current rich editor: %s', (html) => {
    expect(hasLegacyRichPublicationHtml(html)).toBe(false);
  });
});
