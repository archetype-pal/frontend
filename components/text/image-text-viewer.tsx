import * as React from 'react';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { toDptHtml } from '@/lib/tei-to-dpt-html';

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
  return (
    <div
      className={className ?? 'prose prose-sm dark:prose-invert max-w-none'}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
