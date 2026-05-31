import * as React from 'react';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { toDptHtml } from '@/lib/tei-to-dpt-html';
import { cn } from '@/lib/utils';

interface ImageTextViewerProps {
  html: string;
  className?: string;
}

export function ImageTextViewer({ html, className }: ImageTextViewerProps) {
  // Content may be legacy data-dpt HTML or (post-Phase-H) TEI XML; render both
  // as data-dpt HTML so the prose CSS and text↔region linking are unchanged.
  const safeHtml = React.useMemo(
    () => sanitizeHtml(toDptHtml(html), { allowDataAttr: true }),
    [html]
  );
  // Junicode (font-transcription) renders the Latin transcription — and the
  // translation, for visual consistency — with full medieval-Latin glyph
  // coverage. Applied here so every consumer (viewer panel, text pages,
  // backoffice preview/editor) gets it.
  return (
    <div
      className={cn(
        'font-transcription',
        className ?? 'prose prose-sm dark:prose-invert max-w-none'
      )}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
